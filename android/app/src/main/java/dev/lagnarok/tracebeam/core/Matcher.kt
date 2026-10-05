package dev.lagnarok.tracebeam.core

import dev.lagnarok.tracebeam.data.FixEntity

data class MatchResult(
    val score: Double,
    val isExact: Boolean,
    val why: String,
    val entry: FixEntity
)

object Matcher {
    private const val EXACT_THRESHOLD = 1.0
    private const val FUZZY_MIN_JACCARD = 0.55
    private const val ALERT_THRESHOLD = 0.60
    private const val RECENCY_WINDOW_SECONDS = 14 * 86400L

    // In-memory alert cooldown per fingerprint (60 seconds)
    private val alertCooldowns = mutableMapOf<String, Long>()

    fun shouldAlert(fp: String): Boolean {
        val now = System.currentTimeMillis() / 1000L
        val lastAlert = alertCooldowns[fp]
        if (lastAlert != null && (now - lastAlert) < 60L) {
            return false
        }
        alertCooldowns[fp] = now
        return true
    }

    fun scoreMatch(beacon: Signature, entry: FixEntity): MatchResult? {
        val isExact = beacon.fp == entry.fp
        var baseScore = 0.0

        if (isExact) {
            baseScore = 1.0
        } else if (beacon.fam == entry.fam) {
            val jaccard = SignatureEngine.jaccardEstimate(beacon.mh, entry.mh)
            if (jaccard >= FUZZY_MIN_JACCARD) {
                baseScore = jaccard
            } else {
                return null
            }
        } else {
            return null
        }

        // Recency boost (up to +0.10 for fixes solved in the last 14 days)
        val now = System.currentTimeMillis() / 1000L
        val age = (now - entry.solvedAt).coerceAtLeast(0L)
        val recencyBoost = if (age < RECENCY_WINDOW_SECONDS) {
            0.10 * (1.0 - (age.toDouble() / RECENCY_WINDOW_SECONDS))
        } else 0.0

        val totalScore = (baseScore + recencyBoost).coerceAtMost(1.0)

        // Explainable "why" line from overlapping keywords
        val beaconKw = beacon.kw.toSet()
        val entryKw = entry.keywords.split(",").map { it.trim().lowercase() }.toSet()
        val shared = beaconKw.intersect(entryKw)
        val why = if (isExact) {
            "Identical error signature & class: ${entry.cls}"
        } else if (shared.isNotEmpty()) {
            "Matching family ${entry.fam} (shared cues: ${shared.take(3).joinToString(", ")})"
        } else {
            "Similar ${entry.fam} pattern (${(totalScore * 100).toInt()}% match)"
        }

        return MatchResult(
            score = totalScore,
            isExact = isExact,
            why = why,
            entry = entry
        )
    }

    fun findBestMatch(beacon: Signature, ledger: List<FixEntity>): MatchResult? {
        var best: MatchResult? = null

        for (entry in ledger) {
            val res = scoreMatch(beacon, entry) ?: continue
            if (res.score >= ALERT_THRESHOLD) {
                if (best == null || res.score > best.score) {
                    best = res
                }
            }
        }

        return best
    }
}
