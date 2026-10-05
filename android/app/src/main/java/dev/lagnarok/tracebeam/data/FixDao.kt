package dev.lagnarok.tracebeam.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface FixDao {
    @Query("SELECT * FROM fixes ORDER BY solvedAt DESC")
    fun getAllFixes(): Flow<List<FixEntity>>

    @Query("SELECT * FROM fixes ORDER BY solvedAt DESC")
    suspend fun getAllFixesSync(): List<FixEntity>

    @Query("SELECT * FROM fixes WHERE fp = :fp LIMIT 1")
    suspend fun findByFingerprint(fp: String): FixEntity?

    @Query("SELECT * FROM fixes WHERE fam = :family ORDER BY solvedAt DESC")
    suspend fun findByFamily(family: String): List<FixEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFix(fix: FixEntity)

    @Query("DELETE FROM fixes WHERE id = :id")
    suspend fun deleteFix(id: String)
}
