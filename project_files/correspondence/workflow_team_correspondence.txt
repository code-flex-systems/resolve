Me:

As I work on building out workflows themselves, I would like to get an idea of how work moves from location to location and what business rules drive workload adjustments. Typically in workflows there is a manual submission of work to the next stage (or desk location in this case). Either that or we need a definition of done for each desk location - i.e. when a claim is sitting in this desk location, what tells the system it should now be moved forward to the next desk location?

For workload adjustments, my plan is to make them manual first. The idea would be to have a workflow dashboard that shows relevant suggested actions to admins - "Desk location X is full - set this location as priority 1 for Y number of users" - "X claims are approaching Y deadline at Desk Location Z - assign 5 users with available capacity to this location" - or similar. All the admin has to do is confirm the suggestions, maybe with optional adjustments. There would of course be support for doing any of this manually as well, but my thought is that if we are able to evaluate and suggest, it's just one simple step further to automate entirely.

What I need from you guys is the mechanics for how the work moves from location to location. I also want to understand the business rules around workload evaluation. This includes answers to questions like, how does the system measure a user's capacity? how does it measure the amount of work involved in a claim for a specific step in the workflow? are there limits specified for desk locations, or do we let the system calculate based on assigned user capacities?

Team:

Currently, work is moved both manually and through workflow. Most movement is manual. Wherever the system allows a workflow rule to transition a claim, we try to take advantage of it. Workflow movement may happen from one team to another, or from one desk location to another within the same team.

Examples of current workflow movement include:

· Claims without a claim payment to pursue. Assigned manually to a Pending desk location. When a payment is posted, workflow automatically moves the claim to a Transactional desk location for handling.

· Claims involving Rental coverage. Assigned manually to a Pending desk location. When the rental payment is posted, workflow moves the claim to a Transactional desk location for handling.

· Closed Pursuit claims with a new pursuable payment. When an additional payment is posted, workflow moves the claim from Closed Pursuit to a Documentation Transactional desk location for review.

· Uninsured claims with automated letters. On uninsured claims with low recovery potential, letters generate automatically. After the designated number of letters is completed, workflow moves the claim to a Closed desk location.

We also have workflow triggers driven by claim age, either from the loss date or from the amount of time a claim has remained in a Pending desk location without activity. For example:

· Auto LOB claims are not delivered to users for review until 21 days from the loss date. Workflow monitors the claim age and releases the file to the appropriate desk when the 21-day threshold is met.

We manage workload evaluation in two different ways, through claim delivery and through tasks.

1. Claim Delivery (File Throughput)

For claim delivery via workflow, work is measured by throughput, which represents the number of files that should move forward within our process. Throughput expectations are set based on client recovery goals, and staffing is aligned accordingly to ensure we meet those objectives. This is how we measure the amount of work involved in claim movement at each step.

Using claim delivery also allows us to prioritize work within the desk location. For example, we can focus on claims over $10,000 for a designated period (such as two hours), then shift to claims with the best recoverable opportunity for the next block of time (such as three hours), and use the remainder of the day to prioritize based on how long a claim has been assigned to the desk location. This gives us flexibility to structure daily work in a way that aligns with recovery goals and urgency.

2. Tasks (Work Units)

Tasks operate under a separate workload model using work units.

Each desk location is assigned a specific number of Available Work Units for task-based work.
Each task type (e.g., Outbound Phone Call, Send Demand Package) is configured with an expected completion time.
1 work unit = 5 minutes. For example, if an Outbound Phone Call is estimated to take 10 minutes, it is assigned 2 work units.
When tasks are delivered to a desk location, the assigned work units accumulate until the desk’s capacity is reached. Once capacity is met, additional tasks are automatically scheduled for the next available day.

Me:

Thanks, this is definitely helpful. When you mentioned defining throughput as the number of files that should move forward, what files are you referring to? Also, Jeff mentioned that claims should be able to be worked in multiple desk locations at once - is that correct?

Team:

When I’ve said “files,” I meant claims. Sorry about any confusion. I’ll stick with “claims” going forward.

Regarding Jeff’s statement that claims can be worked on by multiple desk locations at the same time, this is correct. We achieve this through the task functionality. While a claim is assigned to one primary desk location, tasks can be assigned to multiple desk locations within the process.
For example, if the Pursuit desk has ownership of a claim but needs a document sent to the adverse insurance carrier as part of negotiations, it is not necessary to reassign the claim itself. The Pursuit team member can create a task for the Documentation desk location to complete the work. This allows multiple teams to contribute without disrupting ownership of the claim.
