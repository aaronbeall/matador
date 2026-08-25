# Project vision

Matador exists to be an actually useful, actually free AI brain for retail
traders. It is an open-source project, not an AI-trading SaaS product.

## The promise

Matador runs locally. The user's market data, strategy, journal, portfolio,
and analysis history stay on their machine. There is no Matador account,
hosted backend, subscription, telemetry, or provider lock-in.

Users bring their own AI agent and market-data access. Those providers may
have their own costs, but Matador adds none. A fully free setup should be
possible, while users remain free to choose paid providers when they want
better models or data.

## What Matador is

- A local trading copilot and persistent second brain.
- A shared workspace where market evidence, strategy, AI judgment, and
  outcomes remain inspectable.
- A decision-support system that helps traders plan, monitor, and review.
- Provider-independent infrastructure that anyone can modify for their own
  workflow.
- A project that values useful restraint, including saying when no trade
  qualifies.

## What Matador is not

- A hosted subscription product or paid signal service.
- A promise of profit or a substitute for the trader's judgment.
- A brokerage or autonomous execution system at its core.
- A social or copy-trading platform.
- A general-purpose replacement for professional charting software.

## Direction

The first job is to prove the complete workflow with one real setup. The
current reference setup uses Claude as the agent and Alpaca as the data
source.

Once that workflow is solid, Matador should make agents and data providers
replaceable through clear interfaces and configuration. It should offer a
small number of well-documented recommended setups, along with setup guides,
strategy templates, and examples that get a retail trader from installation
to a useful working system.

Flexibility should not come at the expense of usability: there should always
be a supported golden path that works out of the box.

## Guiding principle

Most trading tools show traders more information. Matador should help them
maintain a coherent process: see the evidence, state the thesis, define what
would change it, act deliberately, and keep an honest record of the result.
