package dev.lagnarok.tracebeam

import dev.lagnarok.tracebeam.core.SignatureEngine
import org.junit.Assert.*
import org.junit.Test

class SignatureEngineTest {

    @Test
    fun testIsolateExtractsErrorWindow() {
        val sample = "noise line 1\nTraceback (most recent call last):\n  File \"app.py\", line 12\nZeroDivisionError: division by zero"
        val isolated = SignatureEngine.isolate(sample)
        assertTrue(isolated.contains("Traceback"))
        assertTrue(isolated.contains("ZeroDivisionError"))
        assertFalse(isolated.contains("noise line 1"))
    }

    @Test
    fun testRedactRemovesSensitiveSecrets() {
        val text = "Error: connection failed\nDB_URL=postgres://admin:secretpassword123@10.0.0.1:5432/mydb\nTOKEN=eyJhbGciOiJIUzI1NiJ9"
        val redacted = SignatureEngine.redact(text)
        assertFalse(redacted.contains("secretpassword123"))
        assertFalse(redacted.contains("10.0.0.1"))
        assertFalse(redacted.contains("eyJhbGciOiJIUzI1NiJ9"))
        assertTrue(redacted.contains("[REDACTED]"))
    }

    @Test
    fun testTemplateNormalizesPathsAndNumbers() {
        val text = "File \"/deep/nested/path/utils.py\", line 42"
        val templated = SignatureEngine.template(text)
        assertTrue(templated.contains("utils.py"))
        assertTrue(templated.contains("<N>"))
        assertFalse(templated.contains("/deep/nested/path"))
    }

    @Test
    fun testDetectFamilyIdentifiesRuntimes() {
        assertEquals("python", SignatureEngine.detectFamily("Traceback (most recent call last):"))
        assertEquals("node", SignatureEngine.detectFamily("TypeError: Cannot read properties of undefined\n at Object.<anonymous>"))
        assertEquals("java", SignatureEngine.detectFamily("Exception in thread \"main\" java.lang.NullPointerException"))
        assertEquals("gradle", SignatureEngine.detectFamily("FAILURE: Build failed with an exception."))
        assertEquals("flutter", SignatureEngine.detectFamily("RenderFlex overflowed by 42 pixels"))
    }

    @Test
    fun testFingerprintIsDeterministic() {
        val fp1 = SignatureEngine.fingerprint("python", "ModuleNotFoundError", "No module named '<STR>'")
        val fp2 = SignatureEngine.fingerprint("python", "ModuleNotFoundError", "No module named '<STR>'")
        val fp3 = SignatureEngine.fingerprint("java", "NullPointerException", "Cannot invoke String.length()")

        assertEquals(16, fp1.length)
        assertEquals(fp1, fp2)
        assertNotEquals(fp1, fp3)
    }

    @Test
    fun testMinHashJaccardSelfMatch() {
        val tokens = listOf("ndk", "abi", "mismatch", "cmake", "arm64")
        val mh = SignatureEngine.minhash(tokens)
        val jaccard = SignatureEngine.jaccardEstimate(mh, mh)
        assertEquals(1.0, jaccard, 0.001)
    }
}
