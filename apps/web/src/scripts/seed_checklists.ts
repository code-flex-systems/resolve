import 'dotenv/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { DB } from '../api/database/types';

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

const pool = new pg.Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  ssl: false,
});

pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
}).withSchema('public');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLIENT_ID = '1c118f90-3153-4dfb-b350-953e42f0d1aa';

// ---------------------------------------------------------------------------
// Template types
// ---------------------------------------------------------------------------

interface QuestionDef {
  text: string;
  type: 'single' | 'freeform' | 'dropdown' | 'multi';
  answers: string[];
  unlockChildIndex?: number;
  unlockChildTitle?: string;
}

interface PageDef {
  title: string;
  questions: QuestionDef[];
  children?: PageDef[];
}

interface ChecklistDef {
  name: string;
  description: string;
  published: boolean;
  lob: string;
  pages: PageDef[];
}

// ---------------------------------------------------------------------------
// AUTO CHECKLIST (~100 questions across pages with nested children)
// ---------------------------------------------------------------------------

const AUTO_CHECKLIST: ChecklistDef = {
  name: 'Auto Claims Investigation',
  description:
    'Comprehensive investigation checklist for automobile insurance claims including liability, damages, and recovery.',
  published: true,
  lob: 'auto',
  pages: [
    {
      title: 'Initial Assessment',
      questions: [
        { text: 'Has the date of loss been verified?', type: 'single', answers: ['Yes', 'No', 'Pending verification'] },
        { text: 'Was the claim reported within the policy reporting window?', type: 'single', answers: ['Yes', 'No', 'Under review'] },
        { text: "What is the insured's policy number?", type: 'freeform', answers: [''] },
        { text: "Has the insured's identity been confirmed?", type: 'single', answers: ['Yes', 'No'] },
        { text: 'What type of loss occurred?', type: 'dropdown', answers: ['Collision', 'Comprehensive', 'Hit and run', 'Theft', 'Vandalism', 'Weather damage'] },
        { text: 'Describe the circumstances of the loss.', type: 'freeform', answers: [''] },
        { text: 'Where did the loss occur?', type: 'freeform', answers: [''] },
        { text: 'Were there any witnesses to the incident?', type: 'single', answers: ['Yes', 'No', 'Unknown'] },
        { text: 'Has a police report been filed?', type: 'single', answers: ['Yes', 'No', 'Not applicable'] },
        { text: 'Police report number (if applicable):', type: 'freeform', answers: [''] },
        { text: "Is the insured's coverage confirmed and active?", type: 'single', answers: ['Yes - coverage confirmed', 'No - coverage issue identified', 'Pending verification'], unlockChildIndex: 0, unlockChildTitle: 'Coverage Analysis' },
        { text: 'Additional notes on initial assessment:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Coverage Analysis',
          questions: [
            { text: 'What is the policy effective date?', type: 'freeform', answers: [''] },
            { text: 'What is the policy expiration date?', type: 'freeform', answers: [''] },
            { text: 'Select all applicable coverage types:', type: 'multi', answers: ['Collision', 'Comprehensive', 'Liability', 'Uninsured motorist', 'Medical payments', 'PIP'] },
            { text: 'What is the collision deductible amount?', type: 'freeform', answers: [''] },
            { text: 'What is the comprehensive deductible amount?', type: 'freeform', answers: [''] },
            { text: 'What are the liability limits?', type: 'freeform', answers: [''] },
            { text: 'Are there any policy exclusions that may apply?', type: 'single', answers: ['Yes', 'No', 'Under review'] },
            { text: 'Describe any applicable exclusions:', type: 'freeform', answers: [''] },
            { text: 'Are multiple coverages applicable to this loss?', type: 'single', answers: ['Yes', 'No'], unlockChildIndex: 0, unlockChildTitle: 'Multi-Coverage Breakdown' },
            { text: 'Coverage analysis notes:', type: 'freeform', answers: [''] },
          ],
          children: [
            {
              title: 'Multi-Coverage Breakdown',
              questions: [
                { text: 'List all coverages being applied:', type: 'freeform', answers: [''] },
                { text: 'What is the primary coverage?', type: 'dropdown', answers: ['Collision', 'Comprehensive', 'Liability', 'UM/UIM', 'Medical payments'] },
                { text: 'How is the deductible being allocated?', type: 'freeform', answers: [''] },
                { text: 'Are there coordination of benefits issues?', type: 'single', answers: ['Yes', 'No'] },
                { text: 'What is the total combined coverage limit?', type: 'freeform', answers: [''] },
                { text: 'Is there potential for subrogation on any coverage?', type: 'single', answers: ['Yes', 'No', 'Pending evaluation'] },
                { text: 'Per-coverage reserve amounts:', type: 'freeform', answers: [''] },
                { text: 'Multi-coverage notes:', type: 'freeform', answers: [''] },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Vehicle Damage Assessment',
      questions: [
        { text: 'What is the year, make, and model of the vehicle?', type: 'freeform', answers: [''] },
        { text: 'What is the vehicle VIN?', type: 'freeform', answers: [''] },
        { text: 'What is the current mileage?', type: 'freeform', answers: [''] },
        { text: 'Describe the damage to the vehicle:', type: 'freeform', answers: [''] },
        { text: 'Were photos of the damage obtained?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'Is the vehicle drivable?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Were airbags deployed?', type: 'single', answers: ['Yes', 'No', 'Not applicable'] },
        { text: 'Has a repair estimate been obtained?', type: 'single', answers: ['Yes', 'No', 'In progress'] },
        { text: 'What is the estimated repair cost?', type: 'freeform', answers: [''] },
        { text: 'Name of repair facility:', type: 'freeform', answers: [''] },
        { text: 'Is the vehicle repairable?', type: 'single', answers: ['Yes', 'No - total loss'], unlockChildIndex: 1, unlockChildTitle: 'Total Loss Evaluation' },
        { text: 'Vehicle damage assessment notes:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Total Loss Evaluation',
          questions: [
            { text: 'What is the fair market value of the vehicle?', type: 'freeform', answers: [''] },
            { text: 'What is the estimated salvage value?', type: 'freeform', answers: [''] },
            { text: 'Does repair cost exceed the total loss threshold?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Has the owner been notified of total loss determination?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
            { text: 'Does the owner wish to retain the vehicle?', type: 'single', answers: ['Yes', 'No', 'Undecided'] },
            { text: 'What is the proposed settlement amount?', type: 'freeform', answers: [''] },
            { text: 'Are there any liens on the vehicle?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Total loss evaluation notes:', type: 'freeform', answers: [''] },
          ],
        },
      ],
    },
    {
      title: 'Liability Investigation',
      questions: [
        { text: 'Has the police report been reviewed?', type: 'single', answers: ['Yes', 'No', 'Not available'] },
        { text: 'What is the preliminary fault determination?', type: 'dropdown', answers: ['Insured at fault', 'Third party at fault', 'Shared fault', 'Under investigation'] },
        { text: 'What percentage of fault is attributed to the insured?', type: 'freeform', answers: [''] },
        { text: 'Were any traffic citations issued?', type: 'single', answers: ['Yes - to insured', 'Yes - to third party', 'Yes - to both', 'No'] },
        { text: 'Were witness statements obtained?', type: 'single', answers: ['Yes', 'No', 'In progress'] },
        { text: 'Is there dash cam or surveillance footage?', type: 'single', answers: ['Yes', 'No', 'Being requested'] },
        { text: 'Does comparative negligence apply in this jurisdiction?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'What negligence standard applies?', type: 'dropdown', answers: ['Pure comparative', 'Modified comparative (50%)', 'Modified comparative (51%)', 'Contributory'] },
        { text: 'Is a third party involved?', type: 'single', answers: ['Yes', 'No'], unlockChildIndex: 0, unlockChildTitle: 'Third Party Details' },
        { text: 'Liability investigation summary:', type: 'freeform', answers: [''] },
        { text: 'Are there any liability disputes?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Recommended liability position:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Third Party Details',
          questions: [
            { text: 'Third party name:', type: 'freeform', answers: [''] },
            { text: 'Third party insurance carrier:', type: 'freeform', answers: [''] },
            { text: 'Third party policy number:', type: 'freeform', answers: [''] },
            { text: 'Third party claim number:', type: 'freeform', answers: [''] },
            { text: 'Has contact been made with the third party carrier?', type: 'single', answers: ['Yes', 'No', 'Attempted'] },
            { text: 'Has the third party accepted liability?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
            { text: 'Third party vehicle information:', type: 'freeform', answers: [''] },
            { text: 'Third party contact notes:', type: 'freeform', answers: [''] },
          ],
        },
      ],
    },
    {
      title: 'Medical Review',
      questions: [
        { text: 'Were any injuries reported?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'How many individuals were injured?', type: 'freeform', answers: [''] },
        { text: 'Describe the injuries sustained:', type: 'freeform', answers: [''] },
        { text: 'Was emergency medical treatment required?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Have medical records been requested?', type: 'single', answers: ['Yes', 'No', 'Not applicable'] },
        { text: 'Have medical bills been received?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'Total medical expenses to date:', type: 'freeform', answers: [''] },
        { text: 'Is PIP or MedPay coverage applicable?', type: 'single', answers: ['Yes - PIP', 'Yes - MedPay', 'Both', 'Neither'] },
        { text: 'Is the injured party still receiving treatment?', type: 'single', answers: ['Yes', 'No', 'Unknown'] },
        { text: 'Medical review notes:', type: 'freeform', answers: [''] },
      ],
    },
    {
      title: 'Subrogation Evaluation',
      questions: [
        { text: 'Is there subrogation potential?', type: 'single', answers: ['Yes', 'No', 'Under evaluation'] },
        { text: 'Who is the target of subrogation?', type: 'freeform', answers: [''] },
        { text: 'What is the estimated recovery amount?', type: 'freeform', answers: [''] },
        { text: 'Has a demand letter been sent?', type: 'single', answers: ['Yes', 'No', 'In preparation'] },
        { text: 'Date demand letter was sent:', type: 'freeform', answers: [''] },
        { text: 'Has a response been received?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'What is the applicable statute of limitations?', type: 'freeform', answers: [''] },
        { text: 'Statute expiration date:', type: 'freeform', answers: [''] },
        { text: 'Is arbitration being considered?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Subrogation strategy notes:', type: 'freeform', answers: [''] },
      ],
    },
    {
      title: 'Claim Resolution',
      questions: [
        { text: 'What is the proposed settlement amount?', type: 'freeform', answers: [''] },
        { text: 'Has the settlement been approved?', type: 'single', answers: ['Yes', 'No', 'Pending approval'] },
        { text: 'Payment method:', type: 'dropdown', answers: ['Check', 'Direct deposit', 'Wire transfer', 'Directed to repair facility'] },
        { text: 'Has a release been obtained?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'Have all liens been satisfied?', type: 'single', answers: ['Yes', 'No', 'Not applicable'] },
        { text: 'Has the insured been notified of resolution?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Are there any remaining open items?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Describe any remaining open items:', type: 'freeform', answers: [''] },
        { text: 'Final claim notes and summary:', type: 'freeform', answers: [''] },
        { text: 'Is this claim ready to close?', type: 'single', answers: ['Yes', 'No - pending items remain'] },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PROPERTY CHECKLIST (~100 questions across pages with nested children)
// ---------------------------------------------------------------------------

const PROPERTY_CHECKLIST: ChecklistDef = {
  name: 'Property Claims Investigation',
  description:
    'Investigation checklist for property insurance claims including damage assessment, repairs, and recovery.',
  published: true,
  lob: 'property',
  pages: [
    {
      title: 'Loss Report & Verification',
      questions: [
        { text: 'Date of loss:', type: 'freeform', answers: [''] },
        { text: 'Has the loss date been verified?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Type of property damage:', type: 'dropdown', answers: ['Fire', 'Water damage', 'Wind/Storm', 'Theft', 'Vandalism', 'Other'] },
        { text: 'Property address:', type: 'freeform', answers: [''] },
        { text: 'Is the property owner-occupied or rental?', type: 'single', answers: ['Owner-occupied', 'Rental', 'Vacant'] },
        { text: 'Was the property secured after the loss?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'Were emergency services called?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Incident report number:', type: 'freeform', answers: [''] },
        { text: 'Describe the loss event:', type: 'freeform', answers: [''] },
        { text: 'Has an inspection been scheduled?', type: 'single', answers: ['Yes', 'No', 'In progress'], unlockChildIndex: 0, unlockChildTitle: 'Property Inspection' },
        { text: 'Are temporary repairs needed?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Loss report notes:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Property Inspection',
          questions: [
            { text: 'Date of inspection:', type: 'freeform', answers: [''] },
            { text: 'Inspector name:', type: 'freeform', answers: [''] },
            { text: 'Overall condition of the property:', type: 'dropdown', answers: ['Good - minor damage', 'Fair - moderate damage', 'Poor - significant damage', 'Uninhabitable'] },
            { text: 'Were photos taken during inspection?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Is the damage consistent with the reported loss?', type: 'single', answers: ['Yes', 'No', 'Partially'] },
            { text: 'Was pre-existing damage observed?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Describe the pre-existing damage if any:', type: 'freeform', answers: [''] },
            { text: 'Estimated extent of damage:', type: 'freeform', answers: [''] },
            { text: 'Is there significant structural damage?', type: 'single', answers: ['Yes', 'No'], unlockChildIndex: 0, unlockChildTitle: 'Detailed Damage Assessment' },
            { text: 'Inspection summary notes:', type: 'freeform', answers: [''] },
          ],
          children: [
            {
              title: 'Detailed Damage Assessment',
              questions: [
                { text: 'Which structural elements are affected?', type: 'multi', answers: ['Foundation', 'Load-bearing walls', 'Roof structure', 'Electrical system', 'Plumbing', 'HVAC'] },
                { text: 'Is the structure safe for occupancy?', type: 'single', answers: ['Yes', 'No', 'Conditional'] },
                { text: 'Has an engineer assessment been requested?', type: 'single', answers: ['Yes', 'No'] },
                { text: 'Estimated structural repair cost:', type: 'freeform', answers: [''] },
                { text: 'Timeline for structural repairs:', type: 'freeform', answers: [''] },
                { text: 'Are permits required?', type: 'single', answers: ['Yes', 'No', 'Under review'] },
                { text: 'Detailed damage description:', type: 'freeform', answers: [''] },
                { text: 'Structural assessment notes:', type: 'freeform', answers: [''] },
              ],
            },
          ],
        },
      ],
    },
    {
      title: 'Coverage & Policy Review',
      questions: [
        { text: 'Policy number:', type: 'freeform', answers: [''] },
        { text: 'Dwelling coverage limit:', type: 'freeform', answers: [''] },
        { text: 'Personal property coverage limit:', type: 'freeform', answers: [''] },
        { text: 'Loss of use coverage limit:', type: 'freeform', answers: [''] },
        { text: 'Deductible amount:', type: 'freeform', answers: [''] },
        { text: 'Select all applicable coverages:', type: 'multi', answers: ['Dwelling', 'Personal property', 'Loss of use', 'Other structures', 'Liability'] },
        { text: 'Are there any applicable endorsements?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'List applicable endorsements:', type: 'freeform', answers: [''] },
        { text: 'Is replacement cost or actual cash value applicable?', type: 'single', answers: ['Replacement cost', 'Actual cash value'] },
        { text: 'Are there any exclusions that may apply?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Is additional living expense (ALE) applicable?', type: 'single', answers: ['Yes', 'No'], unlockChildIndex: 0, unlockChildTitle: 'Additional Living Expense' },
        { text: 'Coverage review notes:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Additional Living Expense',
          questions: [
            { text: 'Is the property uninhabitable?', type: 'single', answers: ['Yes', 'No', 'Partially'] },
            { text: 'Estimated duration of displacement:', type: 'freeform', answers: [''] },
            { text: 'Where is the insured currently residing?', type: 'freeform', answers: [''] },
            { text: 'Monthly ALE amount approved:', type: 'freeform', answers: [''] },
            { text: 'Has the insured submitted ALE receipts?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Total ALE paid to date:', type: 'freeform', answers: [''] },
            { text: 'Expected return-to-home date:', type: 'freeform', answers: [''] },
            { text: 'ALE tracking notes:', type: 'freeform', answers: [''] },
          ],
        },
      ],
    },
    {
      title: 'Contractor & Repair Management',
      questions: [
        { text: 'Has a contractor been selected?', type: 'single', answers: ['Yes', 'No', 'Getting estimates'] },
        { text: 'Contractor name:', type: 'freeform', answers: [''] },
        { text: 'Is the contractor licensed and insured?', type: 'single', answers: ['Yes', 'No', 'Pending verification'] },
        { text: 'Has a scope of work been agreed upon?', type: 'single', answers: ['Yes', 'No', 'In negotiation'] },
        { text: 'What is the agreed repair estimate?', type: 'freeform', answers: [''] },
        { text: 'Expected start date of repairs:', type: 'freeform', answers: [''] },
        { text: 'Expected completion date:', type: 'freeform', answers: [''] },
        { text: 'Are multiple vendors needed?', type: 'single', answers: ['Yes', 'No'], unlockChildIndex: 0, unlockChildTitle: 'Vendor Coordination' },
        { text: 'Have change orders been submitted?', type: 'single', answers: ['Yes', 'No', 'Not yet applicable'] },
        { text: 'Repair management notes:', type: 'freeform', answers: [''] },
      ],
      children: [
        {
          title: 'Vendor Coordination',
          questions: [
            { text: 'How many vendors are involved?', type: 'freeform', answers: [''] },
            { text: 'List all vendors and their specialties:', type: 'freeform', answers: [''] },
            { text: 'Has a lead contractor been designated?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Are vendor schedules coordinated?', type: 'single', answers: ['Yes', 'No', 'In progress'] },
            { text: 'Total combined vendor estimates:', type: 'freeform', answers: [''] },
            { text: 'Are there any vendor disputes?', type: 'single', answers: ['Yes', 'No'] },
            { text: 'Vendor coordination status:', type: 'freeform', answers: [''] },
            { text: 'Vendor coordination notes:', type: 'freeform', answers: [''] },
          ],
        },
      ],
    },
    {
      title: 'Contents Inventory',
      questions: [
        { text: 'Has a contents inventory list been submitted?', type: 'single', answers: ['Yes', 'No', 'In progress'] },
        { text: 'How many items are on the inventory?', type: 'freeform', answers: [''] },
        { text: 'Total claimed value of contents:', type: 'freeform', answers: [''] },
        { text: 'Have receipts or proof of ownership been provided?', type: 'single', answers: ['Yes - for all items', 'Yes - for some items', 'No'] },
        { text: 'Has the inventory been verified?', type: 'single', answers: ['Yes', 'No', 'In progress'] },
        { text: 'Are there any high-value items (over $5,000)?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'List any high-value items:', type: 'freeform', answers: [''] },
        { text: 'Is replacement cost or ACV being applied to contents?', type: 'single', answers: ['Replacement cost', 'ACV'] },
        { text: 'Total approved contents value:', type: 'freeform', answers: [''] },
        { text: 'Contents inventory notes:', type: 'freeform', answers: [''] },
      ],
    },
    {
      title: 'Subrogation & Recovery',
      questions: [
        { text: 'Is there a responsible third party?', type: 'single', answers: ['Yes', 'No', 'Under investigation'] },
        { text: 'Name of responsible party:', type: 'freeform', answers: [''] },
        { text: 'Has a demand been sent?', type: 'single', answers: ['Yes', 'No', 'In preparation'] },
        { text: 'What is the estimated recovery amount?', type: 'freeform', answers: [''] },
        { text: 'Has a response been received?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Applicable statute of limitations:', type: 'freeform', answers: [''] },
        { text: 'Is salvage recovery applicable?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Estimated salvage value:', type: 'freeform', answers: [''] },
        { text: 'Has deductible reimbursement been arranged?', type: 'single', answers: ['Yes', 'No', 'Not applicable'] },
        { text: 'Recovery notes:', type: 'freeform', answers: [''] },
      ],
    },
    {
      title: 'Settlement & Closure',
      questions: [
        { text: 'What is the total claim amount?', type: 'freeform', answers: [''] },
        { text: 'Breakdown: dwelling damage amount:', type: 'freeform', answers: [''] },
        { text: 'Breakdown: contents damage amount:', type: 'freeform', answers: [''] },
        { text: 'Breakdown: ALE amount:', type: 'freeform', answers: [''] },
        { text: 'Less deductible:', type: 'freeform', answers: [''] },
        { text: 'Net settlement amount:', type: 'freeform', answers: [''] },
        { text: 'Has the settlement been approved?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        { text: 'Payment method:', type: 'dropdown', answers: ['Check', 'Direct deposit', 'Wire transfer', 'Directed to contractor'] },
        { text: 'Has the insured signed the proof of loss?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Are there any holdbacks for recoverable depreciation?', type: 'single', answers: ['Yes', 'No'] },
        { text: 'Is this claim ready to close?', type: 'single', answers: ['Yes', 'No - pending items remain'] },
        { text: 'Final settlement and closure notes:', type: 'freeform', answers: [''] },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// STUB CHECKLISTS (unpublished, minimal)
// ---------------------------------------------------------------------------

function createStubChecklist(name: string, lob: string): ChecklistDef {
  return {
    name,
    description: `Investigation checklist for ${name.toLowerCase()} claims.`,
    published: false,
    lob,
    pages: [
      {
        title: 'Initial Review',
        questions: [
          { text: 'Has the claim been acknowledged?', type: 'single', answers: ['Yes', 'No'] },
          { text: 'Date claim was received:', type: 'freeform', answers: [''] },
          { text: 'Claimant name:', type: 'freeform', answers: [''] },
          { text: 'Brief description of the claim:', type: 'freeform', answers: [''] },
          { text: 'Has the policy been verified?', type: 'single', answers: ['Yes', 'No', 'Pending'] },
        ],
      },
      {
        title: 'Investigation',
        questions: [
          { text: 'What is the current investigation status?', type: 'dropdown', answers: ['Not started', 'In progress', 'Complete'] },
          { text: 'Key findings:', type: 'freeform', answers: [''] },
          { text: 'Are there any coverage issues?', type: 'single', answers: ['Yes', 'No'] },
          { text: 'Estimated exposure amount:', type: 'freeform', answers: [''] },
          { text: 'Investigation notes:', type: 'freeform', answers: [''] },
        ],
      },
      {
        title: 'Resolution',
        questions: [
          { text: 'Recommended resolution:', type: 'dropdown', answers: ['Settlement', 'Denial', 'Litigation', 'Pending'] },
          { text: 'Settlement amount if applicable:', type: 'freeform', answers: [''] },
          { text: 'Has the resolution been approved?', type: 'single', answers: ['Yes', 'No'] },
          { text: 'Closure date:', type: 'freeform', answers: [''] },
          { text: 'Final notes:', type: 'freeform', answers: [''] },
        ],
      },
    ],
  };
}

const STUB_CHECKLISTS: ChecklistDef[] = [
  createStubChecklist('General Liability Claims Investigation', 'general_liability'),
  createStubChecklist('Workers Compensation Claims Investigation', 'workers_comp'),
  createStubChecklist('Professional Liability Claims Investigation', 'professional_liability'),
];

// ---------------------------------------------------------------------------
// Tracking types for inserted data
// ---------------------------------------------------------------------------

interface InsertedAnswer {
  answerId: string;
  questionId: string;
  text: string;
  position: number;
  unlockChildTitle?: string;
}

interface InsertedQuestion {
  questionId: string;
  pageId: string;
  instanceId: string;
  text: string;
  type: string;
  answers: InsertedAnswer[];
}

interface InsertedInstance {
  instanceId: string;
  pageId: string;
  title: string;
  parentInstanceId: string | null;
  questions: InsertedQuestion[];
}

interface InsertedChecklist {
  checklistId: string;
  def: ChecklistDef;
  instances: InsertedInstance[];
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

const counts = {
  checklists: 0,
  pages: 0,
  pageInstances: 0,
  questions: 0,
  answers: 0,
  answerCallEdges: 0,
  checklistClaims: 0,
  questionResponses: 0,
  questionResponseAnswers: 0,
  pageInstanceStatuses: 0,
};

// ---------------------------------------------------------------------------
// Freeform response generator
// ---------------------------------------------------------------------------

function generateFreeformResponse(questionText: string): string {
  const lower = questionText.toLowerCase();
  if (lower.includes('date')) return '03/15/2026';
  if (lower.includes('amount') || lower.includes('cost') || lower.includes('value') || lower.includes('limit') || lower.includes('deductible') || lower.includes('reserve') || lower.includes('expense') || lower.includes('settlement') || lower.includes('estimate')) return '$12,500.00';
  if (lower.includes('name') || lower.includes('carrier') || lower.includes('facility') || lower.includes('contractor') || lower.includes('inspector')) return 'John Smith';
  if (lower.includes('number') || lower.includes('vin') || lower.includes('policy')) return 'POL-2026-48291';
  if (lower.includes('address')) return '123 Main Street, Springfield, IL 62701';
  if (lower.includes('mileage')) return '45,230';
  if (lower.includes('percentage') || lower.includes('percent')) return '25%';
  if (lower.includes('describe') || lower.includes('notes') || lower.includes('summary') || lower.includes('findings') || lower.includes('description') || lower.includes('circumstances') || lower.includes('items') || lower.includes('specialties') || lower.includes('coverages') || lower.includes('information') || lower.includes('status') || lower.includes('timeline')) return 'Reviewed and documented per standard procedures.';
  if (lower.includes('how many') || lower.includes('individuals')) return '3';
  if (lower.includes('duration')) return '6-8 weeks';
  if (lower.includes('where')) return 'Temporary housing arranged nearby.';
  return 'Confirmed';
}

// ---------------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------------

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(probability: number): boolean {
  return Math.random() < probability;
}

// ---------------------------------------------------------------------------
// Step 1: Wipe checklist-related tables
// ---------------------------------------------------------------------------

async function wipeTables(): Promise<void> {
  console.log('Wiping checklist-related tables...');
  await sql`TRUNCATE TABLE question_response_answer, question_response, page_instance_status, answer_call_edges, answer, question, page_instance, page, checklist_claim, checklist, comment, action, action_log CASCADE`.execute(db);
  console.log('Tables wiped.');
}

// ---------------------------------------------------------------------------
// Step 2: Get admin user
// ---------------------------------------------------------------------------

async function getAdminUserId(): Promise<string> {
  const admin = await db
    .selectFrom('users')
    .select('id')
    .where('client_id', '=', CLIENT_ID)
    .where('role', 'in', ['Admin', 'Super Admin'])
    .executeTakeFirstOrThrow();
  return admin.id;
}

// ---------------------------------------------------------------------------
// Step 3: Insert a checklist template (pages, questions, answers, edges)
// ---------------------------------------------------------------------------

async function insertChecklist(
  def: ChecklistDef,
  adminId: string,
): Promise<InsertedChecklist> {
  return db.transaction().execute(async (trx) => {
    // Insert checklist record
    const checklist = await trx
      .insertInto('checklist')
      .values({
        name: def.name,
        description: def.description,
        published: def.published,
        client_id: CLIENT_ID,
        created_by: adminId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    counts.checklists++;
    const checklistId = checklist.id;
    const allInstances: InsertedInstance[] = [];

    // Deferred unlock links: answer ID -> child page title
    const unlockLinks: Array<{ answerId: string; childTitle: string; parentInstanceId: string }> = [];

    // Recursive page inserter
    async function insertPageTree(
      pageDefs: PageDef[],
      parentInstanceId: string | null,
    ): Promise<void> {
      for (let pos = 0; pos < pageDefs.length; pos++) {
        const pageDef = pageDefs[pos];

        // Insert page template
        const page = await trx
          .insertInto('page')
          .values({
            title: pageDef.title,
            client_id: CLIENT_ID,
            created_by: adminId,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.pages++;

        // Insert page instance
        const instance = await trx
          .insertInto('page_instance')
          .values({
            page_id: page.id,
            checklist_id: checklistId,
            parent_instance_id: parentInstanceId,
            position: pos,
            client_id: CLIENT_ID,
            created_by: adminId,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.pageInstances++;

        const insertedQuestions: InsertedQuestion[] = [];

        // Insert questions
        for (let qPos = 0; qPos < pageDef.questions.length; qPos++) {
          const qDef = pageDef.questions[qPos];

          const question = await trx
            .insertInto('question')
            .values({
              page_id: page.id,
              text: qDef.text,
              type: qDef.type,
              position: qPos,
              client_id: CLIENT_ID,
              created_by: adminId,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          counts.questions++;

          const insertedAnswers: InsertedAnswer[] = [];

          // Insert answers (skip for freeform with single empty answer)
          const hasRealAnswers = !(qDef.type === 'freeform' && qDef.answers.length === 1 && qDef.answers[0] === '');

          if (hasRealAnswers) {
            for (let aPos = 0; aPos < qDef.answers.length; aPos++) {
              const answerText = qDef.answers[aPos];
              const answer = await trx
                .insertInto('answer')
                .values({
                  question_id: question.id,
                  text: answerText,
                  position: aPos,
                  client_id: CLIENT_ID,
                  created_by: adminId,
                })
                .returning('id')
                .executeTakeFirstOrThrow();
              counts.answers++;

              const ia: InsertedAnswer = {
                answerId: answer.id,
                questionId: question.id,
                text: answerText,
                position: aPos,
              };

              // Track unlock link if this is the unlocking answer
              if (qDef.unlockChildTitle != null && qDef.unlockChildIndex === aPos) {
                ia.unlockChildTitle = qDef.unlockChildTitle;
                unlockLinks.push({
                  answerId: answer.id,
                  childTitle: qDef.unlockChildTitle,
                  parentInstanceId: instance.id,
                });
              }

              insertedAnswers.push(ia);
            }
          }

          insertedQuestions.push({
            questionId: question.id,
            pageId: page.id,
            instanceId: instance.id,
            text: qDef.text,
            type: qDef.type,
            answers: insertedAnswers,
          });
        }

        allInstances.push({
          instanceId: instance.id,
          pageId: page.id,
          title: pageDef.title,
          parentInstanceId: parentInstanceId,
          questions: insertedQuestions,
        });

        // Recurse into children
        if (pageDef.children && pageDef.children.length > 0) {
          await insertPageTree(pageDef.children, instance.id);
        }
      }
    }

    await insertPageTree(def.pages, null);

    // Resolve unlock links: set calls_instance_id on answers and create answer_call_edges
    for (const link of unlockLinks) {
      const targetInstance = allInstances.find(
        (inst) => inst.title === link.childTitle && inst.parentInstanceId === link.parentInstanceId,
      );
      if (!targetInstance) {
        console.warn(`  WARNING: Could not find child instance "${link.childTitle}" for unlock link`);
        continue;
      }

      // Update answer's calls_instance_id
      await trx
        .updateTable('answer')
        .set({ calls_instance_id: targetInstance.instanceId })
        .where('id', '=', link.answerId)
        .execute();

      // Find the from_instance (the parent of the target, which is the page containing the question)
      const answerQuestion = allInstances
        .flatMap((i) => i.questions)
        .flatMap((q) => q.answers)
        .find((a) => a.answerId === link.answerId);

      const fromInstance = allInstances.find(
        (inst) => inst.questions.some((q) => q.answers.some((a) => a.answerId === link.answerId)),
      );

      if (fromInstance && answerQuestion) {
        await trx
          .insertInto('answer_call_edges')
          .values({
            answer_id: link.answerId,
            checklist_id: checklistId,
            from_instance_id: fromInstance.instanceId,
            to_instance_id: targetInstance.instanceId,
            client_id: CLIENT_ID,
          })
          .execute();
        counts.answerCallEdges++;
      }
    }

    return { checklistId, def, instances: allInstances };
  });
}

// ---------------------------------------------------------------------------
// Step 4: Create checklist_claim records
// ---------------------------------------------------------------------------

function deriveChecklistClaimStatus(recoveryStatus: string | null): string {
  switch (recoveryStatus) {
    case 'recovered':
    case 'closed_no_recovery':
      return 'Submitted';
    case 'in_progress':
      return 'In Progress';
    default:
      return 'Unworked';
  }
}

async function createChecklistClaims(
  inserted: InsertedChecklist,
  adminId: string,
  userIds: string[],
): Promise<Array<{ checklistId: string; claimId: string; status: string; assignee: string }>> {
  const claims = await db
    .selectFrom('claim')
    .select(['id', 'recovery_status'])
    .where('client_id', '=', CLIENT_ID)
    .where('line_of_business', '=', inserted.def.lob)
    .execute();

  if (claims.length === 0) {
    console.log(`  No ${inserted.def.lob} claims found, skipping checklist_claim creation.`);
    return [];
  }

  const records: Array<{ checklistId: string; claimId: string; status: string; assignee: string }> = [];

  for (const claim of claims) {
    const status = deriveChecklistClaimStatus(claim.recovery_status);
    const assignee = randomElement(userIds);
    const isSubmitted = status === 'Submitted';

    await db
      .insertInto('checklist_claim')
      .values({
        checklist_id: inserted.checklistId,
        claim_id: claim.id,
        client_id: CLIENT_ID,
        created_by: adminId,
        status,
        assignee,
        submitted_at: isSubmitted ? new Date() : null,
        submitted_by: isSubmitted ? assignee : null,
      })
      .execute();

    counts.checklistClaims++;
    records.push({ checklistId: inserted.checklistId, claimId: claim.id, status, assignee });
  }

  return records;
}

// ---------------------------------------------------------------------------
// Step 5: Generate responses for a checklist_claim
// ---------------------------------------------------------------------------

async function generateResponses(
  inserted: InsertedChecklist,
  cc: { checklistId: string; claimId: string; status: string; assignee: string },
): Promise<Map<string, { total: number; answered: number }>> {
  // Determine answer rate based on status
  let answerRate: number;
  switch (cc.status) {
    case 'Submitted':
      answerRate = 0.9;
      break;
    case 'In Progress':
      answerRate = 0.5;
      break;
    default:
      answerRate = 0.1;
  }

  // Track per-instance response counts for page_instance_status
  const instanceResponseCounts = new Map<string, { total: number; answered: number }>();

  // Walk root instances first, then children (BFS order already in allInstances from DFS)
  for (const inst of inserted.instances) {
    const isChildPage = inst.parentInstanceId !== null;
    const totalQuestions = inst.questions.length;
    let answeredCount = 0;

    for (const q of inst.questions) {
      // For child pages, only generate responses if this is a submitted claim
      // (simulating that the unlock answer was selected)
      if (isChildPage && cc.status !== 'Submitted') {
        continue;
      }

      const shouldAnswer = randomBool(answerRate);
      if (!shouldAnswer) continue;

      // Check if this is an unlock question on a submitted claim -> always pick the unlock answer
      const unlockAnswer = q.answers.find((a) => a.unlockChildTitle != null);
      const isUnlockQuestion = unlockAnswer != null && cc.status === 'Submitted';

      if (q.type === 'freeform' && q.answers.length === 0) {
        // Pure freeform question (no answer records)
        const responseText = generateFreeformResponse(q.text);
        await db
          .insertInto('question_response')
          .values({
            question_id: q.questionId,
            response_text: responseText,
            checklist_id: cc.checklistId,
            claim_id: cc.claimId,
            instance_id: q.instanceId,
            client_id: CLIENT_ID,
            created_by: cc.assignee,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.questionResponses++;
        answeredCount++;
      } else if (q.type === 'freeform') {
        // Freeform with no real answers - just text
        const responseText = generateFreeformResponse(q.text);
        await db
          .insertInto('question_response')
          .values({
            question_id: q.questionId,
            response_text: responseText,
            checklist_id: cc.checklistId,
            claim_id: cc.claimId,
            instance_id: q.instanceId,
            client_id: CLIENT_ID,
            created_by: cc.assignee,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.questionResponses++;
        answeredCount++;
      } else if (q.type === 'multi') {
        // Multi-select: pick 1-3 random answers
        const numToSelect = Math.min(q.answers.length, Math.floor(Math.random() * 3) + 1);
        const shuffled = [...q.answers].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, numToSelect);

        const response = await db
          .insertInto('question_response')
          .values({
            question_id: q.questionId,
            response_text: null,
            checklist_id: cc.checklistId,
            claim_id: cc.claimId,
            instance_id: q.instanceId,
            client_id: CLIENT_ID,
            created_by: cc.assignee,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.questionResponses++;

        for (const ans of selected) {
          await db
            .insertInto('question_response_answer')
            .values({
              response_id: response.id,
              answer_id: ans.answerId,
              additional_info: null,
            })
            .execute();
          counts.questionResponseAnswers++;
        }
        answeredCount++;
      } else {
        // single or dropdown: pick one answer
        let selectedAnswer: InsertedAnswer;
        if (isUnlockQuestion && unlockAnswer) {
          selectedAnswer = unlockAnswer;
        } else {
          selectedAnswer = randomElement(q.answers);
        }

        const response = await db
          .insertInto('question_response')
          .values({
            question_id: q.questionId,
            response_text: null,
            checklist_id: cc.checklistId,
            claim_id: cc.claimId,
            instance_id: q.instanceId,
            client_id: CLIENT_ID,
            created_by: cc.assignee,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        counts.questionResponses++;

        await db
          .insertInto('question_response_answer')
          .values({
            response_id: response.id,
            answer_id: selectedAnswer.answerId,
            additional_info: null,
          })
          .execute();
        counts.questionResponseAnswers++;
        answeredCount++;
      }
    }

    instanceResponseCounts.set(inst.instanceId, {
      total: totalQuestions,
      answered: answeredCount,
    });
  }

  return instanceResponseCounts;
}

// ---------------------------------------------------------------------------
// Step 6: Create page_instance_status records
// ---------------------------------------------------------------------------

async function createPageInstanceStatuses(
  inserted: InsertedChecklist,
  claimId: string,
  instanceResponseCounts: Map<string, { total: number; answered: number }>,
): Promise<void> {
  for (const inst of inserted.instances) {
    const rc = instanceResponseCounts.get(inst.instanceId);
    if (!rc || rc.answered === 0) continue;

    const status = rc.answered >= rc.total ? 'complete' : 'in-progress';

    await db
      .insertInto('page_instance_status')
      .values({
        page_instance_id: inst.instanceId,
        claim_id: claimId,
        status,
        template_version: 1,
        client_id: CLIENT_ID,
      })
      .execute();
    counts.pageInstanceStatuses++;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Checklist Seed Script ===\n');

  // Step 1: Wipe
  await wipeTables();

  // Step 2: Get admin user
  const adminId = await getAdminUserId();
  console.log(`Admin user: ${adminId}`);

  // Get all users for assignment
  const users = await db
    .selectFrom('users')
    .select('id')
    .where('client_id', '=', CLIENT_ID)
    .execute();
  const userIds = users.map((u) => u.id);
  console.log(`Found ${userIds.length} users for assignment.\n`);

  // Step 3: Insert checklist templates
  console.log('--- Inserting checklist templates ---');

  const allInserted: InsertedChecklist[] = [];

  console.log(`Inserting: ${AUTO_CHECKLIST.name}`);
  const autoInserted = await insertChecklist(AUTO_CHECKLIST, adminId);
  allInserted.push(autoInserted);
  console.log(`  -> ${autoInserted.instances.length} page instances created`);

  console.log(`Inserting: ${PROPERTY_CHECKLIST.name}`);
  const propInserted = await insertChecklist(PROPERTY_CHECKLIST, adminId);
  allInserted.push(propInserted);
  console.log(`  -> ${propInserted.instances.length} page instances created`);

  for (const stub of STUB_CHECKLISTS) {
    console.log(`Inserting: ${stub.name}`);
    const stubInserted = await insertChecklist(stub, adminId);
    allInserted.push(stubInserted);
    console.log(`  -> ${stubInserted.instances.length} page instances created`);
  }

  // Step 4 & 5 & 6: Create checklist_claims, responses, and page_instance_statuses
  // Only for published checklists (auto + property)
  console.log('\n--- Creating checklist_claim records and responses ---');

  for (const inserted of allInserted) {
    if (!inserted.def.published) {
      console.log(`Skipping ${inserted.def.name} (unpublished)`);
      continue;
    }

    console.log(`Processing: ${inserted.def.name} (lob=${inserted.def.lob})`);
    const ccRecords = await createChecklistClaims(inserted, adminId, userIds);
    console.log(`  -> ${ccRecords.length} checklist_claim records`);

    let responseCount = 0;
    for (const cc of ccRecords) {
      const instanceResponseCounts = await generateResponses(inserted, cc);
      await createPageInstanceStatuses(inserted, cc.claimId, instanceResponseCounts);
      responseCount++;
    }
    console.log(`  -> Responses generated for ${responseCount} claims`);
  }

  // Step 7: Print summary
  console.log('\n=== Seed Complete ===');
  console.log(`Checklists:               ${counts.checklists}`);
  console.log(`Pages:                    ${counts.pages}`);
  console.log(`Page Instances:           ${counts.pageInstances}`);
  console.log(`Questions:                ${counts.questions}`);
  console.log(`Answers:                  ${counts.answers}`);
  console.log(`Answer Call Edges:        ${counts.answerCallEdges}`);
  console.log(`Checklist Claims:         ${counts.checklistClaims}`);
  console.log(`Question Responses:       ${counts.questionResponses}`);
  console.log(`Question Response Answers: ${counts.questionResponseAnswers}`);
  console.log(`Page Instance Statuses:   ${counts.pageInstanceStatuses}`);
}

main()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
