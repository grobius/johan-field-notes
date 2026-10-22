---
title: 'A tiny water-monitoring experiment'
description: 'Designing for one useful reading every two hours changes almost every technical priority.'
published: 2026-09-28
tags: ['IoT', 'Hardware', 'Low power']
kind: 'Project'
featured: false
image: '/images/note-water.svg'
imageAlt: 'A simplified sensor board above a blue water-level line'
imageLabel: 'Lab note / sensor node'
---

For this water-monitoring experiment, I only need one useful reading every two hours. That sounds like a small scheduling detail, but it turns the design into something quite different from a sensor that reports continuously.

Battery life is therefore the primary constraint. It moves the attention away from peak performance and towards sleep current, controlled sensor power, warm-up time and the cost of every radio transmission.

It is a useful reminder for me that the best architecture follows the rhythm of the real-world task. A requirement that initially sounds like a scheduling detail can change the whole design.

The next part is to validate the assumptions with real measurements rather than a spreadsheet: what the sensor draws while asleep, how long it needs to settle, and what each transmission actually costs.
