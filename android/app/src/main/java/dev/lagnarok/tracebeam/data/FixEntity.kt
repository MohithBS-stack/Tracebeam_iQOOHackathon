package dev.lagnarok.tracebeam.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "fixes")
data class FixEntity(
    @PrimaryKey
    val id: String,
    val fp: String,                // 16 hex chars
    val fam: String,               // Family: gradle, python, etc.
    val cls: String,               // Error class
    val keywords: String,          // Comma-separated tokens
    val mh: ByteArray,             // 32-byte MinHash array
    val summary: String,           // Fix summary
    val voiceNoteText: String,     // Transcribed or recorded voice note
    val solvedAt: Long,            // Unix epoch seconds
    val solvedCount: Int = 1,      // Number of peers helped
    val isSynthetic: Boolean = false
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as FixEntity
        return id == other.id && fp == other.fp && mh.contentEquals(other.mh)
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + fp.hashCode()
        result = 31 * result + mh.contentHashCode()
        return result
    }
}
