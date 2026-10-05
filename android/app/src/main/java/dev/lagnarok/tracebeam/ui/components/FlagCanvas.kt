package dev.lagnarok.tracebeam.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.lagnarok.tracebeam.core.FlagForge
import dev.lagnarok.tracebeam.ui.theme.DarkBorder
import dev.lagnarok.tracebeam.ui.theme.FlagWhite

@Composable
fun FlagView(
    fp: String,
    modifier: Modifier = Modifier,
    size: Dp = 80.dp,
    showCode: Boolean = true
) {
    val model = FlagForge.forge(fp)

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(width = size, height = size * 0.7f)
                .clip(RoundedCornerShape(4.dp))
                .border(2.dp, DarkBorder, RoundedCornerShape(4.dp))
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = this.size.width
                val h = this.size.height

                // Draw base secondary color
                drawRect(model.secondaryColor, size = Size(w, h))

                when (model.patternIndex) {
                    0 -> { // Half vertical
                        drawRect(model.primaryColor, size = Size(w / 2f, h))
                    }
                    1 -> { // Half horizontal
                        drawRect(model.primaryColor, size = Size(w, h / 2f))
                    }
                    2 -> { // Quarters
                        drawRect(model.primaryColor, size = Size(w / 2f, h / 2f))
                        drawRect(
                            model.primaryColor,
                            topLeft = Offset(w / 2f, h / 2f),
                            size = Size(w / 2f, h / 2f)
                        )
                    }
                    3 -> { // Diagonal split
                        val path = Path().apply {
                            moveTo(0f, 0f)
                            lineTo(w, h)
                            lineTo(0f, h)
                            close()
                        }
                        drawPath(path, model.primaryColor)
                    }
                    4 -> { // Cross / Canton
                        drawRect(model.primaryColor, size = Size(w * 0.45f, h * 0.5f))
                    }
                    5 -> { // Border
                        val inset = 8.dp.toPx()
                        drawRect(model.primaryColor, size = Size(w, h))
                        drawRect(
                            model.secondaryColor,
                            topLeft = Offset(inset, inset),
                            size = Size(w - inset * 2f, h - inset * 2f)
                        )
                    }
                    6 -> { // Triband horizontal
                        drawRect(model.primaryColor, size = Size(w, h / 3f))
                        drawRect(
                            model.primaryColor,
                            topLeft = Offset(0f, h * 2f / 3f),
                            size = Size(w, h / 3f)
                        )
                    }
                    7 -> { // Saltire (X)
                        val path = Path().apply {
                            moveTo(0f, 0f)
                            lineTo(w * 0.2f, 0f)
                            lineTo(w, h * 0.8f)
                            lineTo(w, h)
                            lineTo(w * 0.8f, h)
                            lineTo(0f, h * 0.2f)
                            close()
                        }
                        drawPath(path, model.primaryColor)
                    }
                }
            }
        }

        if (showCode) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = model.code,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                color = FlagWhite,
                letterSpacing = 1.sp
            )
        }
    }
}
