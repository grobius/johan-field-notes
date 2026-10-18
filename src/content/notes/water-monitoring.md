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

A sensor that reports continuously is a different product from one that wakes every two hours, takes a trustworthy measurement and goes back to sleep.

For this experiment, battery life is the primary design constraint. That moves attention away from peak performance and toward sleep current, controlled sensor power, warm-up time and the cost of every radio transmission.

It is a useful reminder that the best architecture depends on the rhythm of the real-world task. A requirement that sounds like a scheduling detail can change the whole design.
