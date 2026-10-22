---
title: 'Bluetooth to space. That still sounds slightly unreal.'
description: 'Hubble Network puts Bluetooth radios to work sending small sensor readings to satellites. A few bytes, some interesting constraints, and plenty of possibilities.'
published: 2026-10-20
tags: ['IoT', 'Bluetooth', 'Satellites']
kind: 'Note'
featured: true
image: '/images/hubble-bluetooth-to-space.webp'
imageAlt: 'Conceptual illustration of a small sensor beside a remote lake sending a signal to a satellite above Earth.'
imageLabel: 'AI illustration / conceptual, not actual Hubble hardware'
---

Sending sensor data from a small IoT device directly to a satellite, using a Bluetooth radio, still feels slightly unreal to me.

That is what made me look more closely at [Hubble Network](https://hubble.com/). For devices that only need to send a little information, occasionally, from somewhere inconvenient, the idea opens up some genuinely interesting possibilities.

Hubble combines two ways of collecting that data.

On the ground, devices broadcast small Bluetooth Low Energy packets. A nearby participating phone or gateway picks them up and forwards them to Hubble. For initial experiments, the Hubble Connect app turns your own phone into a gateway. Reception in the wider network depends on a participating gateway being within range. [\[1\]](https://hubble.com/) [\[2\]](https://hubble.com/docs/network/terrestrial/how-it-works)

The second route is the one that made me stop and think. A supported device can transmit directly to a passing satellite using its existing 2.4 GHz Bluetooth radio. Hubble’s software schedules the transmission, and the satellite later forwards the data through a ground station. [\[3\]](https://hubble.com/docs/network/satellite/how-it-works)

<figure style="margin: 2rem 0;">
  <img src="/images/hubble-data-paths.svg" alt="Two paths from a sensor to an application: BLE packets travel through a participating phone or gateway to Hubble; satellite packets use Hubble's protocol to reach a passing satellite, then a ground station and Hubble. Both paths deliver data through an API or webhook." width="840" height="800" loading="lazy" decoding="async" style="width: 100%; height: auto;" />
  <figcaption style="margin-top: .65rem; color: #aeb7b3; font-size: .85rem;">Two routes for a few bytes. Simplified diagram based on Hubble’s technical documentation; satellite reception depends on a pass and regional availability.</figcaption>
</figure>

There is, of course, rather more engineering behind that simple description. The satellite link uses Hubble’s own protocol at a lower bit rate than normal BLE advertising. Current hardware requirements include sufficient transmit power, a suitable antenna and a power supply that can handle the transmission. Many designs need an additional radio amplifier. Bluetooth on the specification sheet is only the starting point. [\[4\]](https://hubble.com/docs/network/satellite/transmission-guidance)

What interests me is what you could do with a few bytes: a temperature reading, a water level, a battery status. Small pieces of information that could make a remote installation much easier to keep an eye on.

Hubble currently supports satellite payloads of up to 13 bytes. Transmission depends on satellite passes, and delivery can take hours. That makes periodic measurements a more natural fit than anything requiring an immediate response. [\[4\]](https://hubble.com/docs/network/satellite/transmission-guidance)

There is also a practical detail for anyone looking at this from Sweden: Hubble’s current documentation lists general satellite availability in the United States, Canada and Mexico. Availability elsewhere needs to be checked with Hubble before planning a deployment. [\[5\]](https://hubble.com/docs/network/satellite/coverage)

For a first experiment, I would keep it deliberately small: one sensor, one reading and a way to see when it arrives. Then I would measure the things that decide whether it is genuinely useful: delivery reliability, battery consumption and cost.

Even before getting to those questions, the basic idea deserves a moment.

A small sensor on the ground, sending a few bytes to a satellite through a Bluetooth radio.

I would like to try it.

---

**Sources — checked 20 October 2026**

1. [Hubble Network](https://hubble.com/)
2. [Terrestrial Network: how it works](https://hubble.com/docs/network/terrestrial/how-it-works)
3. [Satellite Network: how it works](https://hubble.com/docs/network/satellite/how-it-works)
4. [Satellite transmission guidance](https://hubble.com/docs/network/satellite/transmission-guidance)
5. [Satellite coverage and availability](https://hubble.com/docs/network/satellite/coverage)
