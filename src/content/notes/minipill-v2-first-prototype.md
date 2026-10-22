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

The sensor readings on this blog come from my own home-automation projects. Behind those numbers are small devices measuring the world around them—and a project I have been gradually building on.

My water-sensor project started with **MiniPill**, a low-power LoRa sensor board created by **Leo Korbe**. Leo describes the original design on [his IoT Lab blog](https://www.iot-lab.org/blog/370/).

I owe Leo a big thank you. He has done a fantastic job of creating a simple, versatile sensor board and sharing his work. It gave me a practical foundation to build on, and helped turn my own ideas into something tangible.

I am now developing **MiniPill v2**, my own evolution of that design. At its heart is [Seeed Studio’s Wio-E5-LE module](https://www.seeedstudio.com/Wio-E5-LE-Wireless-Module-Bulk-STM32WLE5JC-p-5751.html), built around the [STM32WLE5JC from STMicroelectronics](https://www.st.com/en/microcontrollers-microprocessors/stm32wle5jc.html). It combines an Arm Cortex-M4 processor and a LoRa-capable radio in one chip—a useful starting point for a compact sensor board.

**The first MiniPill v2 prototype is now on its way to my lab for testing.** That is the part I am particularly looking forward to: finding out how the design behaves on the bench.

The aim is to keep building a flexible platform for water monitoring and other measurements around my home. Low power consumption remains central. A sensor should wake up, take a useful reading, transmit it and spend the rest of its time asleep.

Getting there means checking the details: sensor behaviour, radio performance and actual power consumption. Battery life will need to be measured and validated as testing progresses.

The existing sensors already feed data into this blog. As the new board develops, I want to share more of the journey behind those readings—the hardware, the firmware and what I learn along the way.

For now, I am looking forward to opening that first package and powering up the prototype.

**Thank you, Leo, for creating MiniPill and giving this project such a good place to begin.**
