# Stuwy Explain V2 — Master Plan

## Objective

Create curriculum-aware, verifiable, step-by-step mathematics explanations with stable place-value layouts and accessible animation. Production Tutor, Learn and Practice integration is gated on benchmark evidence and product-owner approval.

## Delivery sequence

1. Consolidate the development baseline without deleting or force-pushing branches.
2. Provide a development-only Explanation Lab around deterministic solving and rendering.
3. Expand the structured solver by exercise family and verify every generated step.
4. Add semantic animation contracts for carries, borrowing, regrouping and long division.
5. Benchmark at least 30 exercises across French school grades.
6. Present the approval gate before any production integration.

## Current scope

The first implementation slice is isolated to `/dev/stuwy-explain-v2`. It uses local deterministic computation, existing stepper components and browser-local reviewer notes. It does not call an AI provider, write student data or alter production explanation flows.
