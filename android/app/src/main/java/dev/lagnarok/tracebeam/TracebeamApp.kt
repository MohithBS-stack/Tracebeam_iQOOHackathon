package dev.lagnarok.tracebeam

import android.app.Application
import dev.lagnarok.tracebeam.data.FixDatabase

class TracebeamApp : Application() {
    val database: FixDatabase by lazy { FixDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
    }
}
