package dev.lagnarok.tracebeam

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import dev.lagnarok.tracebeam.core.*
import dev.lagnarok.tracebeam.data.FixEntity
import dev.lagnarok.tracebeam.ui.*
import dev.lagnarok.tracebeam.ui.theme.TracebeamTheme
import kotlinx.coroutines.launch

sealed class Screen {
    object Home : Screen()
    object Hoist : Screen()
    data class MatchAlert(val event: PeerMatchEvent) : Screen()
    data class SolveCard(val signature: Signature) : Screen()
    object Ledger : Screen()
}

class MainActivity : ComponentActivity() {

    private lateinit var haptics: HapticsManager
    private lateinit var meshManager: NearbyMeshManager

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Start mesh scanning on permission grant
        meshManager.startDiscovery()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as TracebeamApp
        val fixDao = app.database.fixDao()
        haptics = HapticsManager(this)

        var currentScreen by mutableStateOf<Screen>(Screen.Home)
        var activeSignature by mutableStateOf<Signature?>(null)

        meshManager = NearbyMeshManager(
            context = this,
            getLedger = { fixDao.getAllFixesSync() },
            onMatchAlert = { event ->
                runOnUiThread {
                    haptics.matchFound()
                    currentScreen = Screen.MatchAlert(event)
                }
            }
        )

        checkAndRequestPermissions()

        setContent {
            TracebeamTheme {
                val isAdvertising by meshManager.isAdvertising.collectAsState()
                val nearbyPeersCount by meshManager.nearbyPeersCount.collectAsState()
                val fixes by fixDao.getAllFixes().collectAsState(initial = emptyList())

                when (val screen = currentScreen) {
                    is Screen.Home -> {
                        HomeScreen(
                            peersCount = nearbyPeersCount,
                            isAdvertising = isAdvertising,
                            onRaiseFlagClick = { currentScreen = Screen.Hoist },
                            onViewLedgerClick = { currentScreen = Screen.Ledger }
                        )
                    }
                    is Screen.Hoist -> {
                        HoistScreen(
                            onHoistConfirmed = { sig ->
                                activeSignature = sig
                                haptics.flagRaised()
                                meshManager.startAdvertising(sig)
                                currentScreen = Screen.Home
                            },
                            onCancel = { currentScreen = Screen.Home }
                        )
                    }
                    is Screen.MatchAlert -> {
                        MatchAlertScreen(
                            event = screen.event,
                            onAccept = {
                                haptics.accepted()
                                currentScreen = Screen.SolveCard(screen.event.beacon)
                            },
                            onDismiss = {
                                currentScreen = Screen.Home
                            }
                        )
                    }
                    is Screen.SolveCard -> {
                        SolveCardScreen(
                            signature = screen.signature,
                            onSaveFix = { entity ->
                                lifecycleScope.launch {
                                    fixDao.insertFix(entity)
                                }
                                haptics.solved()
                                meshManager.stopAdvertising()
                            },
                            onDone = {
                                currentScreen = Screen.Home
                            }
                        )
                    }
                    is Screen.Ledger -> {
                        LedgerScreen(
                            fixes = fixes,
                            onBack = { currentScreen = Screen.Home }
                        )
                    }
                }
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.VIBRATE,
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        } else {
            meshManager.startDiscovery()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        meshManager.stopAdvertising()
        meshManager.stopDiscovery()
    }
}
