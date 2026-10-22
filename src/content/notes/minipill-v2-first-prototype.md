---
title: 'MiniPill v2: small sensors, useful readings, and a first prototype'
description: 'Building on Leo Korbe’s MiniPill for my water-monitoring and home-automation projects, with the first MiniPill v2 prototype on its way to the lab.'
published: 2026-10-21
tags: ['IoT', 'LoRaWAN', 'Hardware', 'Low power']
kind: 'Project'
featured: true
image: '/images/minipill-v2.webp'
imageAlt: 'MiniPill v2 assembly preview showing the blue sensor board, Wio-E5-LE module, sensor connections and underside battery holder.'
imageLabel: 'MiniPill v2 / illustrative assembly preview'
---

The sensor readings on this blog come from my own home-automation projects. Behind those numbers are small devices measuring the world around them, and a board I have been gradually building on.

My water-sensor project started with **MiniPill**, a low-power LoRa sensor board created by **Leo Korbe**. Leo describes the original design on [his IoT Lab blog](https://www.iot-lab.org/blog/370/).

I have Leo to thank for a very practical piece of work. MiniPill is simple, versatile and—equally important—well documented enough to build on. It gave me a foundation for turning a few of my own ideas into something tangible.

I am now developing **MiniPill v2**, my own take on that design. At its heart is [Seeed Studio’s Wio-E5-LE module](https://www.seeedstudio.com/Wio-E5-LE-Wireless-Module-Bulk-STM32WLE5JC-p-5751.html), built around the [STM32WLE5JC from STMicroelectronics](https://www.st.com/en/microcontrollers-microprocessors/stm32wle5jc.html). It combines an Arm Cortex-M4 processor and a LoRa-capable radio in one chip, which is a useful starting point for a compact sensor board.

**The first MiniPill v2 prototype is now on its way to my lab for testing.** This is the stage I enjoy most: finding out what the design actually does on the bench, rather than what I think it will do on paper.

The aim is a flexible platform for water monitoring and other measurements around my home. Low power consumption remains central. A sensor should wake up, take a useful reading, transmit it and spend the rest of its time asleep.

Getting there means checking the unglamorous details: sensor behaviour, radio performance and actual power consumption. Battery life is something I need to measure and validate, not assume from the component datasheets.

The existing sensors already feed data into this blog. As the new board develops, I want to share more of the work behind those readings: the hardware, the firmware and the things that do not work the first time.

For now, I am looking forward to opening that first package and seeing whether it powers up as intended.

Thank you, Leo, for creating MiniPill and giving this project such a useful place to begin.
