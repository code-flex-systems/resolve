# Subrogation Claims Workflow - Process Documentation

**Source:** Legacy Oracle Manifest System
**Date:** 2025
**Purpose:** Text-based workflow documentation derived from visual process diagrams

---

## Workflow Overview

The subrogation claims workflow consists of 7 major phases, each with specific decision points and actions. This document follows the complete lifecycle of a claim from initial referral through final resolution.

---

## Phase 1: Initial Triage & Assessment

### Entry Point
- **New Referral** arrives in the system

### Initial Triage
First assessment of the claim to determine urgency and next steps.

**Decision Point: Immediate Action Needed?**

#### YES Path (Time-Sensitive)
1. **Check Evidence**
   - Decision: Evidence available?
     - **YES** → Proceed to Party Identification (Phase 3)
     - **NO** → Check if time sensitive
       - **Time Sensitive?**
         - **YES** → Proceed to Evaluate Loss (Phase 2)
         - **NO** → Proceed to Evaluate Loss (Phase 2)

#### NO Path (Not Time-Sensitive)
1. **Await 1st Party Payment**
   - Wait for initial payment from first party
   - Decision: Payment Made?
     - **NO** → Continue waiting
     - **YES** → Check for 3rd Party Payment

2. **3rd Party Payment?**
   - Decision: Has third party made payment?
     - **NO** → Return to Evaluate Loss (Phase 2)
     - **YES** → Check contribution/bailment status
       - **Contribution or Bailment?**
         - **YES** → Continue to evaluation
         - **NO** → Close claim (not pursued)

---

## Phase 2: Subrogation Investigation & Evaluation

### Evaluate Loss
Comprehensive assessment of the claim's merit and liability.

1. **Complete Evaluation Checklist**
   - Systematic review of claim facts
   - Documentation of findings

2. **Decision Point: Liability Supported?**
   - **NO** → Close claim (no liability)
   - **YES** → Proceed to Party Identification (Phase 3)

---

## Phase 3: Party Identification & Coverage Verification

This phase focuses on identifying all involved parties and verifying their role in the loss.

### Parties Involved Identification
1. **Build Out Entities**
   - Create records for all parties directly involved in the loss
   - Entity types: Claimants, Responsible Parties, Witnesses, etc.

2. **Identify and Verify Facilitators**
   - Facilitators = External representatives (not directly involved in loss)
   - Types: Adverse Carriers, Attorneys, Experts, Vendors

3. **Decision Point: Involved Facilitators Verified?**
   - **NO** → Continue verification process
   - **YES** → Add newly identified facilitators to database
     - Update facilitator records
     - Link to claim

4. **Decision Point: Final LOB Payment?**
   - Check if all Line of Business payments are complete
   - **NO** → Move to await final 1st party LOB payment
   - **YES** → Proceed to Document Assembly (Phase 4)

---

## Phase 4: Document Assembly & Demand

This phase involves gathering proof of damages and preparing the demand package.

### Gather Proof of Damages
1. **Collect Supporting Documentation**
   - Police reports
   - Medical records
   - Repair invoices
   - Photos/videos
   - Witness statements
   - Loss payments (drafts, settlements, recoveries)

2. **Decision Point: All Payments Supported?**
   - Verify all claimed amounts have documentation
   - **NO** → Return to gather additional documentation
   - **YES** → Proceed to send demand

### Send Out Demand Package
1. **Prepare Demand Letter**
   - Itemize damages
   - Include supporting documentation
   - State liability basis

2. **Financial Data Feed**
   - System records demand sent
   - Tracks expected recovery amount

3. **Decision Point: Adverse Payment Received?**
   - **YES, 100%** → Complete checklist, close claim successfully
   - **NO, Partial or None** → Proceed to Settlement Negotiation (Phase 5)

---

## Phase 5: Settlement Negotiation

Active pursuit of outstanding balance through various communication channels.

### Review Balance Owed
1. **Assessment: Supported and/or Owed?**
   - Verify remaining amount is justified
   - **NO** → Move to Loss Payment Feed (administrative closure)
   - **YES** → Initiate pursuit process

### Pursuit Process
1. **Multi-Channel Communication**
   - Phone calls
   - Electronic mail
   - Letters
   - Fax

2. **Decision Point: Response?**
   - **YES** → Evaluate response quality
     - **Successful Negotiation?**
       - **YES** → Complete checklist, close successfully
       - **NO** → Check arbitration forum membership
         - **Member of Arbitration Forum?**
           - **YES** → File Arbitration (Phase 6)
           - **NO** → Return to negotiation or evaluate litigation
   - **NO Response** → Continue pursuit or escalate

---

## Phase 6: Dispute Resolution - Arbitration

When negotiation fails and parties are members of an arbitration forum.

### File Arbitration
1. **Prepare Arbitration Filing**
   - Complete arbitration forms
   - Submit evidence
   - Pay filing fees

2. **Arbitration Process**
   - Await hearing/decision
   - May involve document exchange
   - Arbitrator reviews case

3. **Results**
   - Arbitrator issues decision
   - Award amount determined

4. **Complete Checklist**
   - Record arbitration outcome
   - Update recovery amounts
   - Close claim

---

## Phase 7: Dispute Resolution - Litigation

When arbitration is not available or ROI justifies court action.

### ROI Review
1. **Assess Return on Investment**
   - Estimate legal costs
   - Evaluate probability of success
   - Compare to potential recovery

2. **Decision Point: Insured?**
   - Check if client carries legal expense insurance
   - **NO** → May still proceed if ROI is favorable
   - **YES** → Proceed to litigation decision

### Litigate
1. **Decision: File Lawsuit?**
   - **NO** → Return to negotiation or close
   - **YES** → Initiate dispute resolution litigation

2. **Dispute Resolution Litigation**
   - File complaint
   - Discovery process
   - Potential settlement discussions
   - Trial if necessary

3. **Complete Checklist**
   - Record litigation outcome
   - Update recovery amounts
   - Close claim

---

## Phase 1.5: Evidence Management (Parallel Process)

This subprocess runs in parallel during the Subro Investigation phase (Phase 2).

### Entry Point
Triggered when evidence is needed for evaluation.

### Evidence Secured?
**Decision Point:**

#### YES Path
1. **Document Controller**
   - Catalog evidence
   - Store in document management system

2. **Confirm in Writing Transfer Communication**
   - Send confirmation to relevant parties
   - Document chain of custody

3. **Return to Evaluation**
   - Evidence now available for assessment

#### NO Path
1. **Still Available?**
   - Check if evidence can still be obtained
   - **YES** → Continue to Document Controller (attempt retrieval)
   - **NO** → Document loss of evidence
     - Record what was lost and why
     - Update claim notes
     - Return to Evaluation (proceed without that evidence)

---

## Desk Location Workflow States

Throughout the process, claims move through standardized desk location states:

1. **Pending** - Awaiting client updates or additional information
2. **RFI (Request for Information)** - Awaiting requested information from external parties
3. **Transactional** - Ready to work, active processing
4. **Review for Closure** - Under final review before closing
5. **Closed** - Work completed and finalized

These states are used across all phases to track claim status within the workflow queue system.

---

## Process Color Coding (Legacy System)

The legacy system used color coding to indicate workflow phase:

- **Light Blue** - Triage
- **Blue** - Subro Investigation
- **Green** - Party Identification and Coverage Verification
- **Yellow** - Document Assembly
- **Pink** - Settlement Negotiation
- **Orange** - Dispute Resolution - Arbitration
- **Gray** - Dispute Resolution - Litigation

---

## Key Workflow Patterns

### Decision-Driven Progression
Most workflow progression is driven by yes/no decision points rather than automatic advancement.

### Multiple Exit Points
Claims can close at various stages:
- No liability found (Phase 2)
- Full payment received (Phase 4)
- Successful negotiation (Phase 5)
- Arbitration award (Phase 6)
- Litigation settlement/judgment (Phase 7)

### Feedback Loops
Several processes loop back to earlier stages:
- Insufficient documentation → Return to gathering
- Failed negotiation → Return to evaluation or escalate
- Evidence unavailable → Proceed with limited information

### Parallel Processes
Evidence management runs in parallel to evaluation, allowing work to continue while documentation is being secured.

---

## Integration Points

### System Inputs
- **New Referral** - Claims enter via data feed
- **Financial Data Feed** - Payment information from client systems
- **1st Party Payment Updates** - Client payment tracking
- **3rd Party Payment Updates** - Adverse party payment tracking

### System Outputs
- **Demand Packages** - Generated and sent to adverse parties
- **Recovery Tracking** - All payments recorded
- **Checklist Completion** - Workflow milestone tracking
- **Closure Records** - Final disposition and outcome

---

## Critical Workflow Rules

1. **Payment Verification Required** - All damages must be supported by documentation before demanding recovery

2. **Party Verification** - All facilitators must be verified before proceeding to demand

3. **LOB Payment Completion** - All Line of Business payments must be finalized before sending demand

4. **ROI Evaluation** - Litigation requires ROI assessment to ensure cost-effectiveness

5. **Evidence Documentation** - Loss of evidence must be formally documented with explanation

---

## Workflow Automation Opportunities

Based on the process diagram, the following steps are candidates for automation in the current system:

### Automated Routing
- Claims meeting specific criteria auto-route to appropriate desk locations
- Status transitions trigger notifications

### Automatic State Changes
- Payment receipt triggers status updates
- Document upload completes documentation requirements
- Checklist completion advances workflow

### Rule-Based Decisions
- Liability calculation based on predefined rules
- ROI assessment using cost/benefit formulas
- Demand package generation from templates

### Integration Triggers
- Financial data feed updates payment status automatically
- 1st/3rd party payment receipt triggers workflow progression
- Evidence receipt updates availability status

---

## Notes on Current Implementation

The current Manifest checklist system simplifies this workflow by:
- Using checklist templates instead of rigid desk location states
- Allowing flexible page unlocking based on responses (conditional workflow)
- Focusing on knowledge capture rather than automated routing
- Prioritizing expert decision tracking over process enforcement

However, key concepts from the legacy system remain relevant:
- Party identification is still critical (currently a gap)
- Document assembly is essential (currently basic S3 storage)
- Settlement negotiation tracking provides value (partially implemented via recovery events)
- Workflow states help users understand claim lifecycle (currently status field on claim)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Next Review:** After Hanover engagement begins (January 2025)
