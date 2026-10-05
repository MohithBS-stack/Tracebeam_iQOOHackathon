package dev.lagnarok.tracebeam.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [FixEntity::class], version = 1, exportSchema = false)
abstract class FixDatabase : RoomDatabase() {
    abstract fun fixDao(): FixDao

    companion object {
        @Volatile
        private var INSTANCE: FixDatabase? = null

        fun getDatabase(context: Context): FixDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FixDatabase::class.java,
                    "tracebeam_ledger.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
