package dev.lagnarok.tracebeam.core

import java.security.MessageDigest

/**
 * Signature data class representing the compact, privacy-safe beacon.
 */
data class Signature(
    val v: Int = 1,
    val fp: String,              // 16 hex chars SHA-256 fingerprint
    val fam: String,             // Runtime family (python, node, gradle, etc.)
    val cls: String,             // Error class (NullPointerException, etc.)
    val kw: List<String>,        // Up to 8 explainable keywords
    val mh: ByteArray,           // 32-byte MinHash array
    val ts: Long = System.currentTimeMillis() / 1000L,
    val ttl: Long = 600L
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as Signature
        return fp == other.fp && fam == other.fam && cls == other.cls && mh.contentEquals(other.mh)
    }

    override fun hashCode(): Int {
        var result = fp.hashCode()
        result = 31 * result + fam.hashCode()
        result = 31 * result + mh.contentHashCode()
        return result
    }
}

data class ExtractedInfo(
    val errorClass: String,
    val messageTemplate: String,
    val libraryFrames: List<String>,
    val versionHints: List<String>
)

object SignatureEngine {

    // ── 1. Isolate ─────────────────────────────────────────────────────────────
    private val ERROR_TRIGGER_REGEX = Regex(
        "(?i)\\b(error|exception|traceback|fatal|failed|panic|segmentation fault|renderflex overflowed)\\b"
    )

    fun isolate(raw: String): String {
        val lines = raw.lines()
        val triggerIndex = lines.indexOfFirst { ERROR_TRIGGER_REGEX.containsMatchIn(it) }
        if (triggerIndex == -1) return ""
        val window = lines.subList(triggerIndex, minOf(lines.size, triggerIndex + 13))
        return window.joinToString("\n").take(8192)
    }

    // ── 2. Redact ──────────────────────────────────────────────────────────────
    fun redact(text: String): String {
        return text
            // Email addresses
            .replace(Regex("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"), "[REDACTED]")
            // IPv4
            .replace(Regex("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"), "[REDACTED]")
            // IPv6
            .replace(Regex("\\b([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\\b"), "[REDACTED]")
            // URLs with credentials
            .replace(Regex("\\b\\w+://[^\\s@/]+:[^\\s@/]+@[^\\s]*"), "[REDACTED]")
            // Inline credentials in assignments
            .replace(
                Regex("(?i)(?:password|passwd|pass|secret|token|key|apikey|api_key|auth|setting|config|env|cred|credential)s?\\s*[=:]\\s*[\"']?([^\\s\"'&,;]+)[\"']?")
            ) { m -> m.value.replace(m.groupValues[1], "[REDACTED]") }
            // Standalone password / secret tokens
            .replace(Regex("(?i)\\b[A-Za-z0-9_\\-]*(?:password|secret)[A-Za-z0-9_\\-]*\\b"), "[REDACTED]")
            // JWT-like tokens
            .replace(Regex("eyJ[A-Za-z0-9_\\-]{4,}(?:\\.[A-Za-z0-9_\\-]+)*"), "[REDACTED]")
            // AWS-style keys
            .replace(Regex("\\bAKIA[0-9A-Z]{16}\\b"), "[REDACTED]")
            // Long opaque hex/alphanumeric tokens (24+ characters)
            .replace(Regex("[A-Za-z0-9_\\-]{24,}"), "[REDACTED]")
            // Usernames in POSIX home paths
            .replace(Regex("/(home|Users)/[^\\s/]+"), "/$1/[REDACTED]")
            // Windows user directory paths
            .replace(Regex("(?i)[A-Za-z]:\\\\Users\\\\[^\\s\\\\]+"), "[DRIVE]:\\\\Users\\\\[REDACTED]")
    }

    // ── 3. Template ────────────────────────────────────────────────────────────
    fun template(text: String): String {
        return text
            // UUIDs
            .replace(Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"), "<UUID>")
            // Absolute paths (POSIX & Windows) -> reduce to basename
            .replace(Regex("(?:/[^/\\s\"']+)+/([^/\\s\"']+)"), "$1")
            .replace(Regex("[A-Za-z]:\\\\(?:[^\\s\\\\]+\\\\)+([^\\s\\\\]+)"), "$1")
            // Hex literals
            .replace(Regex("\\b0x[0-9a-fA-F]+\\b"), "<HEX>")
            .replace(Regex("\\b[0-9a-fA-F]{8,}\\b"), "<HEX>")
            // Quoted strings (preserve filenames with extensions)
            .replace(Regex("([\"'])(?![a-zA-Z0-9_.-]+\\.[a-zA-Z0-9]{1,8}\\1)[^\"']*\\1"), "<STR>")
            // Standalone numbers
            .replace(Regex("(?<![A-Za-z_])\\d+(?!\\w)"), "<N>")
    }

    // ── 4. Detect Family ───────────────────────────────────────────────────────
    private val FAMILY_CUES = listOf(
        "python"  to Regex("Traceback|\\.py[c\"]|SyntaxError|IndentationError|ModuleNotFoundError|ImportError"),
        "node"    to Regex("node_modules|\\.js:\\d|at Object\\.|UnhandledPromiseRejection|require\\("),
        "java"    to Regex("java\\.|\\.java:\\d|NullPointerException|ClassNotFoundException|at com\\."),
        "kotlin"  to Regex("\\.kt:\\d|KotlinNullPointerException|kotlinx\\.|kotlin\\.[A-Z]"),
        "gradle"  to Regex("FAILURE: Build failed|:app:|Gradle|Could not resolve"),
        "react"   to Regex("React|JSX|jsx|useState|useEffect|react-dom"),
        "flutter" to Regex("flutter|dart:|package:flutter|FlutterError|RenderFlex"),
        "cpp"     to Regex("Segmentation fault|core dumped|std::|\\.cpp:\\d|\\.cc:\\d|SIGSEGV"),
        "rust"    to Regex("thread 'main' panicked|\\.rs:\\d|unwrap\\(\\)|Rust"),
        "go"      to Regex("goroutine \\d|\\.go:\\d|panic:|runtime error")
    )

    fun detectFamily(text: String): String {
        for ((fam, regex) in FAMILY_CUES) {
            if (regex.containsMatchIn(text)) return fam
        }
        return "unknown"
    }

    // ── 5. Extract ─────────────────────────────────────────────────────────────
    fun extract(text: String, family: String): ExtractedInfo {
        var errorClass = "Error"
        var messageTemplate = ""

        when (family) {
            "python" -> {
                val match = Regex("([A-Za-z_][A-Za-z0-9_]*Error|[A-Za-z_][A-Za-z0-9_]*Exception):\\s*(.*)").find(text)
                if (match != null) {
                    errorClass = match.groupValues[1]
                    messageTemplate = match.groupValues[2].take(80)
                }
            }
            "java", "kotlin" -> {
                val match = Regex("([a-zA-Z0-9_.]*(?:Exception|Error)):\\s*(.*)").find(text)
                if (match != null) {
                    errorClass = match.groupValues[1].substringAfterLast('.')
                    messageTemplate = match.groupValues[2].take(80)
                }
            }
            "node" -> {
                val match = Regex("([A-Za-z_]+Error):\\s*(.*)").find(text)
                if (match != null) {
                    errorClass = match.groupValues[1]
                    messageTemplate = match.groupValues[2].take(80)
                }
            }
            "gradle" -> {
                errorClass = "BuildFailure"
                val match = Regex(">\\s*(.*)").find(text)
                messageTemplate = match?.groupValues?.get(1)?.take(80) ?: "Build failed"
            }
            "flutter" -> {
                errorClass = "FlutterError"
                val match = Regex("RenderFlex overflowed|([A-Za-z]+Error):\\s*(.*)").find(text)
                messageTemplate = match?.value?.take(80) ?: "Flutter exception"
            }
            else -> {
                val match = Regex("([A-Za-z_]+(?:Error|Exception|Failure)):\\s*(.*)").find(text)
                if (match != null) {
                    errorClass = match.groupValues[1]
                    messageTemplate = match.groupValues[2].take(80)
                } else {
                    messageTemplate = text.lines().firstOrNull()?.take(80) ?: ""
                }
            }
        }

        // Library frames (package names, not app files)
        val frames = mutableListOf<String>()
        val frameRegex = Regex("\\b([a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)+)\\b")
        for (m in frameRegex.findAll(text)) {
            val candidate = m.groupValues[1]
            if (!candidate.startsWith("com.example") && frames.size < 3) {
                frames.add(candidate)
            }
        }

        // Version hints (e.g. NDK 26, Node 20, Python 3.11)
        val versionHints = mutableListOf<String>()
        val vMatch = Regex("(?i)\\b(ndk|node|python|gradle|jdk|flutter)\\s*v?([0-9]+(?:\\.[0-9]+)*)").find(text)
        if (vMatch != null) {
            versionHints.add("${vMatch.groupValues[1]} ${vMatch.groupValues[2]}")
        }

        return ExtractedInfo(errorClass, messageTemplate, frames, versionHints)
    }

    // ── 6. Tokenise ────────────────────────────────────────────────────────────
    private val STOP_WORDS = setOf("the", "and", "for", "with", "this", "that", "from", "line", "file", "str", "hex", "uuid")

    fun tokenise(extracted: ExtractedInfo): List<String> {
        val pool = buildString {
            append(extracted.errorClass).append(" ")
            append(extracted.messageTemplate).append(" ")
            append(extracted.libraryFrames.joinToString(" ")).append(" ")
            append(extracted.versionHints.joinToString(" "))
        }

        return pool.lowercase()
            .split(Regex("[^a-z0-9_-]+"))
            .filter { it.length >= 3 && it !in STOP_WORDS }
            .distinct()
            .take(24)
    }

    // ── 7. Fingerprint ─────────────────────────────────────────────────────────
    fun fingerprint(family: String, errorClass: String, messageTemplate: String): String {
        val input = "$family|$errorClass|$messageTemplate"
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(input.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }.take(16)
    }

    // ── 8. MinHash (16 hash functions, 16 bits = 32 bytes) ────────────────────
    private val MINHASH_SEEDS = intArrayOf(
        0x1b873593, 0x2c49a62f, 0x3d0b271a, 0x4e6d98c5,
        0x5f2f4970, 0x6081faab, 0x71e3db46, 0x8245bc81,
        0x93a79dbc, 0xa409be57, 0xb56bdff2, 0xc6cd008d,
        0xd72f2128, 0xe89141c3, 0xf9f3625e, 0x0b5583f9.toInt()
    )

    fun minhash(tokens: List<String>): ByteArray {
        val bytes = ByteArray(32)
        if (tokens.isEmpty()) return bytes

        for (i in 0 until 16) {
            val seed = MINHASH_SEEDS[i]
            var minVal = 0xFFFF

            for (token in tokens) {
                var h = seed
                for (ch in token) {
                    h = (h xor ch.code) * 0x01000193
                }
                val val16 = (h and 0xFFFF)
                if (val16 < minVal) minVal = val16
            }

            bytes[i * 2] = (minVal and 0xFF).toByte()
            bytes[i * 2 + 1] = ((minVal shr 8) and 0xFF).toByte()
        }

        return bytes
    }

    // ── Jaccard estimation from MinHash ────────────────────────────────────────
    fun jaccardEstimate(mhA: ByteArray, mhB: ByteArray): Double {
        if (mhA.size != 32 || mhB.size != 32) return 0.0
        var matches = 0
        for (i in 0 until 16) {
            val a = (mhA[i * 2].toInt() and 0xFF) or ((mhA[i * 2 + 1].toInt() and 0xFF) shl 8)
            val b = (mhB[i * 2].toInt() and 0xFF) or ((mhB[i * 2 + 1].toInt() and 0xFF) shl 8)
            if (a == b && a != 0) matches++
        }
        return matches.toDouble() / 16.0
    }

    // ── Full Pipeline ──────────────────────────────────────────────────────────
    fun buildSignature(raw: String): Signature? {
        val isolated = isolate(raw)
        if (isolated.isBlank()) return null

        val redacted = redact(isolated)
        val templated = template(redacted)
        val fam = detectFamily(templated)
        val ext = extract(templated, fam)
        val tokens = tokenise(ext)
        val fp = fingerprint(fam, ext.errorClass, ext.messageTemplate)
        val mh = minhash(tokens)
        val kw = tokens.take(8)

        return Signature(
            v = 1,
            fp = fp,
            fam = fam,
            cls = ext.errorClass,
            kw = kw,
            mh = mh
        )
    }
}
