package dev.lagnarok.tracebeam.core

import android.content.Context
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import dev.lagnarok.tracebeam.data.FixEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets

data class PeerMatchEvent(
    val endpointId: String,
    val beacon: Signature,
    val match: MatchResult
)

class NearbyMeshManager(
    private val context: Context,
    private val getLedger: suspend () -> List<FixEntity>,
    private val onMatchAlert: (PeerMatchEvent) -> Unit
) {
    companion object {
        const val SERVICE_ID = "dev.lagnarok.tracebeam"
        val STRATEGY = Strategy.P2P_CLUSTER
    }

    private val client = Nearby.getConnectionsClient(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _isAdvertising = MutableStateFlow(false)
    val isAdvertising: StateFlow<Boolean> = _isAdvertising.asStateFlow()

    private val _isDiscovering = MutableStateFlow(false)
    val isDiscovering: StateFlow<Boolean> = _isDiscovering.asStateFlow()

    private val _nearbyPeersCount = MutableStateFlow(0)
    val nearbyPeersCount: StateFlow<Int> = _nearbyPeersCount.asStateFlow()

    private val activeEndpoints = mutableSetOf<String>()

    // ── 1. Advertise Active Flag Beacon ─────────────────────────────────────────
    fun startAdvertising(signature: Signature) {
        val beaconBytes = encodeBeacon(signature)
        val advertisingOptions = AdvertisingOptions.Builder()
            .setStrategy(STRATEGY)
            .build()

        client.startAdvertising(
            "TB_${signature.fp.take(4)}",
            SERVICE_ID,
            connectionLifecycleCallback,
            advertisingOptions
        ).addOnSuccessListener {
            _isAdvertising.value = true
        }.addOnFailureListener {
            _isAdvertising.value = false
        }
    }

    fun stopAdvertising() {
        client.stopAdvertising()
        _isAdvertising.value = false
    }

    // ── 2. Discover Nearby Beacons (Continuous Background Scan) ─────────────────
    fun startDiscovery() {
        val discoveryOptions = DiscoveryOptions.Builder()
            .setStrategy(STRATEGY)
            .build()

        client.startDiscovery(
            SERVICE_ID,
            endpointDiscoveryCallback,
            discoveryOptions
        ).addOnSuccessListener {
            _isDiscovering.value = true
        }.addOnFailureListener {
            _isDiscovering.value = false
        }
    }

    fun stopDiscovery() {
        client.stopDiscovery()
        _isDiscovering.value = false
        activeEndpoints.clear()
        _nearbyPeersCount.value = 0
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            activeEndpoints.add(endpointId)
            _nearbyPeersCount.value = activeEndpoints.size

            // TECHNICAL.md §8: Decode beacon and run Matcher. No match = No connection.
            scope.launch {
                val ledger = getLedger()
                val parsedBeacon = decodeEndpointInfo(info.endpointName) ?: return@launch

                val bestMatch = Matcher.findBestMatch(parsedBeacon, ledger)
                if (bestMatch != null && Matcher.shouldAlert(parsedBeacon.fp)) {
                    onMatchAlert(PeerMatchEvent(endpointId, parsedBeacon, bestMatch))
                }
            }
        }

        override fun onEndpointLost(endpointId: String) {
            activeEndpoints.remove(endpointId)
            _nearbyPeersCount.value = activeEndpoints.size
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, connectionInfo: ConnectionInfo) {
            // Handshake initiated after both parties tap Accept
            client.acceptConnection(endpointId, payloadCallback)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            // Connection established or rejected
        }

        override fun onDisconnected(endpointId: String) {
            // Peer disconnected
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            // Fix note / handshake exchange
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {}
    }

    // ── Serialization: Compact 45-byte Beacon ──────────────────────────────────
    private fun encodeBeacon(sig: Signature): ByteArray {
        val buffer = ByteBuffer.allocate(64)
        buffer.put(1.toByte()) // version
        val fpBytes = sig.fp.toByteArray(StandardCharsets.US_ASCII).take(16).toByteArray()
        buffer.put(fpBytes)
        val famBytes = sig.fam.take(8).toByteArray(StandardCharsets.US_ASCII)
        buffer.put(famBytes.size.toByte())
        buffer.put(famBytes)
        buffer.put(sig.mh.take(32).toByteArray())
        return buffer.array()
    }

    private fun decodeEndpointInfo(endpointName: String): Signature? {
        if (!endpointName.startsWith("TB_")) return null
        val fpPrefix = endpointName.removePrefix("TB_")
        // Return placeholder signature from beacon metadata for matching
        return Signature(
            v = 1,
            fp = fpPrefix.padEnd(16, '0'),
            fam = "unknown",
            cls = "DetectedError",
            kw = emptyList(),
            mh = ByteArray(32)
        )
    }
}
