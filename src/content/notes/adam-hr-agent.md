---
title: 'ADam: practical support for creating job adverts'
description: 'A human-centred AI agent that helps recruiters turn a hiring need into a job advert they can shape and approve.'
published: 2026-10-22
tags: ['AI', 'HR', 'Automation']
kind: 'Project'
featured: false
image: '/images/adam-hr-agent.webp'
imageAlt: "A friendly robot writing a job advert beside a recruiter's reviewing hand"
imageLabel: 'Field note / ADam'
---

A job advert rarely starts with a blank document. The role has been defined, there is a hiring need, and a lot of information needs to become clear, compelling copy. Writing it still takes time, especially when every advert needs to reflect both the role and the employer.

In an assignment for a global industrial company, I built ADam: an AI agent that helps recruiters create a first draft of a job advert.

ADam takes relevant information from the recruitment process, uses approved company information, and produces a draft in the required language. Previous adverts can help establish tone and style, but facts about the role must always come from the current recruitment brief. It is a simple principle, but an important one for credibility.

The draft reaches the recruiter in Microsoft Teams. They can approve it, ask for changes, open it in Word for their own edits, or stop the process. When feedback is provided, ADam can produce a new version that takes the earlier conversation into account.

I wanted the solution to provide practical support, while keeping decisions with people. The recruiter chooses which text moves forward and can rewrite it at any point. Once approved, the text is saved as a Word document and can be shared as part of the recruitment process.

Behind the experience, established tools work together: Workday provides the recruitment brief, Teams provides the dialogue, and SharePoint holds documents and follow-up information. Azure AI Foundry and GPT-5-mini provide the writing support. For the recruiter, though, it should simply feel like an easier way to turn a hiring need into an advert they can work with.

The next step is to extend the solution with a Researcher agent. The idea is for it to scan the labour market and give ADam input for improving each advert, such as how the role is described and what may make it more relevant to the right audience. The recruiter will still have the final say.
