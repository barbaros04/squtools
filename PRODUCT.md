# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: Solid 2 with TypeScript and Vite. The site is static, its primary work is local filtering and combinatorial scheduling, and the small reactive runtime keeps the client simple without introducing a backend.

## Users

SQU students planning a term, checking whether a room is scheduled, or assessing progress through an academic plan. They typically need a quick, trustworthy answer from a phone or laptop between classes or while registering.

## Product Purpose

Squidwool turns published SQU timetable facts into useful planning tools without a runtime backend. Success is a student finding a workable choice quickly while being able to see how current the underlying snapshot is.

## Positioning

A static, local-first SQU utility collection that keeps schedule data versioned, auditable, and explicit about its freshness rather than presenting a private registration system or live occupancy service.

## Operating Context

The initial tools are Schedule Builder, Empty Room Finder, and Academic Plan Helper. They consume the shared normalized timetable contract. The collector records immutable official SIS captures and produces versioned browser data.

## Capabilities and Constraints

- No runtime backend, credentials, student data, registration actions, or live-availability claims.
- `DLR` means distance learning / online and is not a physical room booking.
- Unknown, field, faculty-room, closed-section, and unassigned-room locations are not free rooms.
- New tools must remain isolated feature modules over shared normalized data.
- Other public SQU data sources may be added through their own raw/provenance/normalization adapters without changing consumers unnecessarily.

## Brand Commitments

Use direct, calm, non-promotional language. Do not manufacture institutional affiliation or live-data claims.

## Evidence on Hand

- Complete Fall 2026/2027 SIS snapshot in `data/`, with a collection manifest, validation report, raw captures, checksums, and source timestamps.
- No logos, photography, testimonials, or institutional endorsement assets are available.

## Product Principles

- Show useful facts before explanation.
- Preserve data provenance all the way to the person using it.
- Keep tool-specific complexity out of the shared data layer.
- Prefer an explicit unknown to a plausible guess.
- Make routine student planning feel lighter, not louder.

## Accessibility & Inclusion

The web interface must be keyboard-operable, responsive, use semantic controls, and maintain readable contrast.
