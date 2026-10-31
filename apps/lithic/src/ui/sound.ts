/**
 * All sound is synthesised in Web Audio, no files:
 * a low vault drone, wind on the surface, and short laser ticks.
 */
export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private depthFilter: BiquadFilterNode | null = null
  private wind: GainNode | null = null
  private depth = 0
  private enabled = false
  private lastTick = 0
  private listeners = new Set<(enabled: boolean) => void>()

  get isEnabled() {
    return this.enabled
  }

  onChange(listener: (enabled: boolean) => void) {
    this.listeners.add(listener)
  }

  /** Must be called from a user gesture (browsers block audio otherwise). */
  enable() {
    if (!this.ctx) this.build()
    const { ctx, master } = this
    if (!ctx || !master) return
    void ctx.resume()
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8)
    this.setEnabled(true)
  }

  disable() {
    const { ctx, master } = this
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    }
    this.setEnabled(false)
  }

  toggle() {
    if (this.enabled) this.disable()
    else this.enable()
  }

  /**
   * 0 = surface, 1 = the bottom of the page. Going deeper muffles everything
   * and the wind dies away, as if the visitor were descending into the rock.
   */
  setDepth(value: number) {
    this.depth = value
    const { ctx, depthFilter, wind } = this
    if (!ctx || !depthFilter || !wind) return
    depthFilter.frequency.setTargetAtTime(9000 * Math.pow(1 - value, 2) + 380, ctx.currentTime, 0.4)
    wind.gain.setTargetAtTime(0.035 * (1 - value), ctx.currentTime, 0.6)
  }

  /** A short, dry laser click. Throttled so fast etching doesn't turn into noise. */
  tick(pitch = 1) {
    const { ctx, master } = this
    if (!this.enabled || !ctx || !master) return
    const now = ctx.currentTime
    if (now - this.lastTick < 0.045) return
    this.lastTick = now

    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(2400 * pitch * (0.92 + Math.random() * 0.16), now)
    osc.frequency.exponentialRampToValueAtTime(900 * pitch, now + 0.04)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.003)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 700
    osc.connect(filter).connect(gain).connect(master)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  /**
   * The plate going down into the vault: a falling rumble for `duration` seconds,
   * then a low, heavy thud as it lands.
   */
  seal(duration = 1.7) {
    const { ctx, master } = this
    if (!this.enabled || !ctx || !master) return
    const now = ctx.currentTime

    const rumble = ctx.createBufferSource()
    rumble.buffer = this.whiteNoise(ctx)
    const sweep = ctx.createBiquadFilter()
    sweep.type = 'lowpass'
    sweep.frequency.setValueAtTime(1200, now)
    sweep.frequency.exponentialRampToValueAtTime(70, now + duration)
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.setValueAtTime(0.0001, now)
    rumbleGain.gain.exponentialRampToValueAtTime(0.14, now + duration * 0.6)
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.1)
    rumble.connect(sweep).connect(rumbleGain).connect(master)
    rumble.start(now)
    rumble.stop(now + duration + 0.2)

    const landing = now + duration
    const thud = ctx.createOscillator()
    thud.frequency.setValueAtTime(95, landing)
    thud.frequency.exponentialRampToValueAtTime(36, landing + 1.1)
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(0.0001, landing)
    thudGain.gain.exponentialRampToValueAtTime(0.55, landing + 0.015)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, landing + 1.5)
    thud.connect(thudGain).connect(master)
    thud.start(landing)
    thud.stop(landing + 1.6)
  }

  private setEnabled(value: boolean) {
    this.enabled = value
    this.listeners.forEach((listener) => listener(value))
  }

  private build() {
    const ctx = new AudioContext()
    const master = ctx.createGain()
    master.gain.value = 0
    const compressor = ctx.createDynamicsCompressor()
    const depthFilter = ctx.createBiquadFilter()
    depthFilter.type = 'lowpass'
    depthFilter.frequency.value = 9000
    master.connect(depthFilter).connect(compressor).connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.depthFilter = depthFilter

    this.buildDrone(ctx, master)
    this.buildWind(ctx, master)
    this.setDepth(this.depth)
  }

  /** Two low sines a fifth apart plus filtered noise: the hum of a sealed chamber. */
  private buildDrone(ctx: AudioContext, out: AudioNode) {
    const bus = ctx.createGain()
    bus.gain.value = 0.16
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 260
    lowpass.Q.value = 0.8
    bus.connect(lowpass).connect(out)

    for (const [freq, level] of [
      [55, 0.55],
      [82.4, 0.3],
      [110.3, 0.12],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.value = level
      osc.connect(gain).connect(bus)
      osc.start()
    }

    // Slow breathing on the filter.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 90
    lfo.connect(lfoDepth).connect(lowpass.frequency)
    lfo.start()

    const rumble = ctx.createBufferSource()
    rumble.buffer = this.brownNoise(ctx)
    rumble.loop = true
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0.5
    rumble.connect(rumbleGain).connect(bus)
    rumble.start()
  }

  /** Band-passed noise whose centre wanders: wind over a ridge. */
  private buildWind(ctx: AudioContext, out: AudioNode) {
    const source = ctx.createBufferSource()
    source.buffer = this.whiteNoise(ctx)
    source.loop = true
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 700
    band.Q.value = 0.9
    const gain = ctx.createGain()
    gain.gain.value = 0.035

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.11
    const depth = ctx.createGain()
    depth.gain.value = 420
    lfo.connect(depth).connect(band.frequency)

    const swell = ctx.createOscillator()
    swell.frequency.value = 0.05
    const swellDepth = ctx.createGain()
    swellDepth.gain.value = 0.02
    swell.connect(swellDepth).connect(gain.gain)

    source.connect(band).connect(gain).connect(out)
    source.start()
    lfo.start()
    swell.start()
    this.wind = gain
  }

  private whiteNoise(ctx: AudioContext) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  private brownNoise(ctx: AudioContext) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    return buffer
  }
}

export const sound = new Sound()
