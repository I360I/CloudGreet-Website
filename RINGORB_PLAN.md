# RingOrb Complete Plan - The Ring Horror Movie Style

## 🎯 **GOAL**
Create concentric circular ripples like The Ring movie well - smooth, organic waves flowing outward from center.

## 📋 **REQUIREMENTS**
1. **Wave Style**: Hero's horizontal waves → circular ripples (EXACT same wave math, circular coordinates)
2. **Background**: Fully transparent (NO fade trail - that causes black square)
3. **Motion**: Waves flow outward like ripples (radial expansion, not static rings)
4. **Reference**: The Ring horror movie well - smooth, flowing, concentric circles

## 🔧 **TECHNICAL SPECS**

### Wave Math (from Hero):
- Amplitude: 15-40
- Frequency: 0.004-0.012
- Base wave: `Math.sin((x * frequency) + phase) * amplitude`
- Secondary wave: `Math.sin((x * frequency * 1.5) + phase * 1.2) * amplitude * 0.2`

### Circular Conversion:
- Convert horizontal `x` coordinate to angle around circle
- For each ring: `angle = (i / points) * Math.PI * 2`
- Radius varies with wave: `radius = baseRadius + waveVariation`
- Wave calculation: Use angle instead of x
  - `baseWave = Math.sin((angle * frequency) + phase) * amplitude`
  - `secondaryWave = Math.sin((angle * frequency * 1.5) + phase * 1.2) * amplitude * 0.2`

### Ripple Flow (Like The Ring):
- Rings expand outward over time
- Each ring has different speed
- Creates flowing, organic ripple effect
- Phase increases → wave moves around circle
- Radius increases slightly → ripple expands outward

### Transparency:
- **NO fade trail** - use `ctx.clearRect(0, 0, width, height)` every frame
- Canvas alpha channel enabled
- Container background transparent

### Animation Quality:
- 360 points per ring (one per degree = smooth circle)
- 60fps timing (16ms increments)
- High-DPI rendering
- Smooth easing on wave motion

## 🎨 **VISUAL STYLE**

### Colors (Hero palette):
- Electric purple gradients
- Opacity: 0.3-0.8
- Glow: shadowBlur 12
- Screen blend mode for additive glow

### Ring Structure:
- 6-8 concentric rings
- Each ring slightly larger radius
- Rings flow independently
- Smooth, organic wave shapes

### Motion:
- Waves flow around circle (phase increases)
- Rings gently expand/contract (like ripples)
- Breathing pulse effect (like Hero)
- Smooth, fluid animation

## ✅ **IMPLEMENTATION CHECKLIST**

1. Remove fade trail completely
2. Use clearRect for full transparency
3. Convert Hero wave math to circular coordinates
4. Add radial expansion (ripple effect)
5. Match Hero colors/opacity/glow exactly
6. 360 points per ring (ultra-smooth)
7. High-DPI rendering support
8. Smooth 60fps animation
9. Test: No black square visible
10. Test: Smooth flowing ripples like The Ring

## 🚫 **WHAT TO AVOID**
- NO fade trail (causes black square)
- NO static rings (they need to flow)
- NO low-resolution (360 points minimum)
- NO dark backgrounds
- NO janky animation

## 🎬 **REFERENCE**
The Ring (2002) - well scene with smooth, flowing concentric ripples expanding outward.

