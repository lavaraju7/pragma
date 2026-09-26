# P1 — The Essence of Good Design

Good design is easy to change. The question is never "does this work?" but "what will it cost to
change this when the requirement changes?" Every other principle here is a technique for lowering
that cost.

A well-designed unit has: low coupling, high cohesion, a clear abstraction, no duplicated knowledge,
and locality of change — a change to one idea touches one place.

## Smells

- A class or module whose description needs the word "and": `UserService` that creates users *and*
  sends email *and* generates PDFs *and* writes to S3.
- Functions longer than a screen, or with more than four parameters.
- A module importing from a dozen others. Long dependency chains (`A -> B -> C -> D -> E`) mean a
  change at the far end ripples all the way back.
- A single requirement change forcing edits in five unrelated files.
- Concrete infrastructure (a database driver, an SDK, a queue client) imported directly into
  business logic.

## What to do

**Give every unit one responsibility.** Split by reason-to-change, not by size.

```ts
// Before: one class, five reasons to change
class UserService {
  createUser() {}
  sendEmail() {}
  generatePdf() {}
  calculateSalary() {}
  writeToS3() {}
}

// After: each changes for its own reason
class UserService {}      // user lifecycle
class EmailService {}     // delivery
class PdfService {}       // rendering
class PayrollService {}   // compensation rules
class StorageService {}   // persistence of blobs
```

**Ask what is likely to change, and put that behind an abstraction.** Payment providers, storage
backends, transports, formats and third-party APIs change. Business rules should not have to change
with them.

```ts
interface PaymentGateway {
  charge(amount: Money): Promise<ChargeResult>;
}
// Stripe and Razorpay implement it; the order flow never mentions either.
```

**Shorten dependency chains.** Prefer `A -> B` to `A -> B -> C -> D -> E -> F`. If a module needs
fifteen collaborators, it is doing fifteen things.

## Checklist

- [ ] Can I describe this unit's responsibility in one sentence without "and"?
- [ ] What is the most likely change in the next six months, and how many files does it touch?
- [ ] Is anything concrete and replaceable (a vendor, a driver) named inside the business logic?
- [ ] Would a new person find the one place to make a given change?

Related: [P2 DRY], [P3 Orthogonality], [P5 Decoupling], [P11 Refactoring]
