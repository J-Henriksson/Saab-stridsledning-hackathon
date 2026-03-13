ATO: skicka uppdrag, vi ska




DATA
1. System boundary: what the “airbase system” contains
The deck defines the airbase system as the part that supports flying units so they can execute missions. It includes:
workflows / processes / activities
command and control functions
resources
unit elements with personnel, equipment, systems, vehicles
infrastructure such as runways, preparation spots, depots/storage
aircraft ammunition / payload
aviation fuel, including tank vehicles and depots
spare parts
methods and tactics for dispersion and mobility within and between airbases
It also explicitly says combat aircraft are not part of the airbase system. In a simulation, that means aircraft should probably be modeled as external mission assets that the airbase services, not as airbase-owned infrastructure. (p. 3)
2. Core airbase workflow / state machine
Across pages 2, 3, and 10, the deck gives you a strong candidate state machine for airbase operations:
transportation of fuel, ammo, spare parts, and support resources
ammo handling
fuel handling
pre-flight
aircraft preparation / turnaround
takeoff
mission
landing
post-flight
decision: mission capable vs not mission capable
corrective maintenance
preventive maintenance
storage / rear maintenance / logistics support
return to available / mission-capable pool
The visual flow also shows resource coupling from:
ground support equipment
personnel
spare parts and logistics
fuel
weapon loadouts
tools
exchange units (UE)
That makes the simulation naturally suited to a discrete-event model or a resource-constrained workflow engine. (pp. 2–3, 10, 16–17)
3. Base network and base types
The deck shows a dispersed base network (“Flygbasgrupp”) with three base categories:
Huvudbaser (main bases)
Sidobaser (side bases)
Reservbaser (reserve bases)
An example assignment on the map slide shows:
Huvudbas X
O-BAS: JAS39, Luftförsvar, H24
O-BAS: JAS39, Inhämtning, H24
T-BAS: TP84, H12
T-BAS: HKP14E, H12
Sidobas Y
O-BAS: JAS39, Luftförsvar, H24
T-BAS: TP100, H12
Useful simulation fields here are:
base ID
base type
geographic group
supported aircraft types
tactical role
operating hours / availability window
relocation / dispersion links between bases
The abbreviations O-BAS and T-BAS are shown but not defined in the deck, so those should stay as SME-defined enums unless you already know the doctrine terms. (p. 4)
4. ATO-driven demand model
The ATO slide says the organization is expected to provide:
a certain number of aircraft according to the ATO
with a specific weapon / payload configuration
at a specific frequency
possibly with an added requirement for start position: which base?
The same slide also shows payload / missile data tied to calendar time and remaining life, which suggests at least some munitions or configurations are life-limited consumables and should have age / remaining-life attributes. (p. 7)
For your program, each ATO line should probably contain:
mission type
time window
required aircraft count
aircraft type mix
payload / weapon config
launch base constraint
sortie frequency
priority
endurance / life-limited store effects
5. Decision roles / agents to model
The deck gives you a multi-agent decision structure:
AOC / higher controller
Basbat chef + staff
Underhållsberedningsfunktion (maintenance planning / readiness)
Underhålls- och klargöringsfunktion (maintenance execution and aircraft preparation)
Klargöringstroppar
ammo / logistics functions
support / maintenance resources
Responsibilities called out in the slides include:
breaking down the ATO into orders for the next 24-hour period
deciding which prep teams work and which rest
deciding which load options are built and moved forward
prioritizing aircraft availability
checking fuel / ammunition status against base endurance and possible regrouping
allocating aircraft to tasks
administering maintenance planning and consequence analysis
updating aircraft cards / status
tracking resource levels
tracking UE flow from local store, RESMAT, or MRO
adding higher-level mission changes and requesting updated resource/base availability
That suggests your sim should not only model physics/logistics, but also decision latency and planning policy. (pp. 8–9, 14)
6. Per-turn game / simulation loop
The “Aktiviteter per spelvarv” slide gives a concrete turn loop:
Set initial aircraft state and resource state.
Interpret ATO.
Review resource situation.
Choose grouping / basing strategy.
Decide manning schedule for prep teams.
Estimate needs for mission fulfillment.
Create timetable for preparation, deployment, and resource securing.
Allocate aircraft to tasks.
Order aircraft preparation.
Prepare aircraft and resource cards / status picture.
Execute preparation and consume/administer resources.
Report outcomes to command and maintenance planners.
Update maintenance plan and new times.
Command time increment.
Start next turn.
It also explicitly says the simulation should make you understand, over time:
fleet status and needs
available resources over time
order / request status
personnel state
how events affect margins and plans
when replanning is needed because thresholds are exceeded (p. 9)
7. Mission execution process
The reconnaissance-mission process slide is especially useful because it shows a mission lifecycle in detail:
Inputs:
mission type: recce, CAP, escort, attack, etc.
which aircraft?
how many?
which aircraft statuses?
which resources?
Preparation phase:
assign aircraft to preparation slots
loading
fueling
weapon hanging
startup / BIT
roll / chance outcome
possible failure branches such as radar replacement, SP replacement, other replacement
Maintenance branch:
aircraft can be routed to maintenance slots
there are front and rear maintenance locations
repairs consume time, personnel, spare parts, tools, fuel, weapon load, and UE
Mission phase:
handoff / departure
mission
reception on return
Post-mission:
reception check
corrective maintenance if needed
weapon handling / pod handling
simple turnaround if enough resources are available
The slide also names maintenance places:
rear maintenance slot for stol, motor
front maintenance slots
multiple maintenance positions
The graphic duplicates one slot number, so I would treat the numbering in the slide as illustrative rather than authoritative. (p. 10)
8. Resource model
Repeated resource categories across the deck are:
UE (utbytesenheter / exchange units)
Reservdelar (spare parts)
Personal
Vapen-last (weapon load)
Verktyg
Bränsle
ground support equipment
logistics / rear support
transportation capacity
For simulation purposes, each resource should probably have:
stock level
location
reservation status
transport time
replenishment source
compatibility constraints
lead time
priority rules
whether it is reusable, consumable, repairable, or cannibalizable
The deck strongly implies that resource availability is a first-class constraint, not just background bookkeeping. (pp. 2–3, 8, 10, 15–17)
9. UE / spare-cycle logic
The skill-assessment slide gives a reusable logistics loop for UE:
UE is limited in number.
There is a loop between base stock, central stock / RESMAT, and MRO.
The diagram shows:
5 days from central stock / RESMAT to base stock
30 days in the MRO-related loop
1 hour for plundring (cannibalization)
The slide explicitly asks you to model the consequences of:
UE shortage
cannibalization / plundering
It also shows initial UE stock at the base and a placeholder “Nu -> xx dagar”, which looks like a starting endurance parameter rather than a fixed value.
This is very useful for a sim because it gives you a closed-loop repair / resupply mechanic rather than a bottomless spare pool. (p. 15)
10. Time model
The deck suggests a layered time model:
planning horizon: 24 hours
turn loop: spelvarv
finer-grain detail: the timeline slide mentions 6 × 10 min detail blocks
command order: aircraft preparation is ordered 1 hour before takeoff
maintenance / repair tasks have nominal times and can incur extra delay T++
some service tasks last multiple days
So a good implementation would use:
strategic layer: day / 24h ATO period
tactical layer: 10-minute or similar ticks
event layer: exact finish times for prep, repair, refuel, rearm, launch, landing, transfer
The slide also asks whether higher time resolution is needed, which is a signal that time granularity should be configurable in the program. (pp. 9, 12, 15)
11. Stochastic maintenance / preparation outcomes
The “Utfall” table is one of the most important pieces of extractable data.
A. Loading / fueling / hanging / startup BIT
Outcome columns 1–6 define:
status
fault/action type
corrective time
required capability
required facility
The table gives:
1: Ok, Quick LRU replacement, 2 h, AU Steg 1, Service Bay (flight line)
2: Ok, Quick LRU replacement, 2 h, AU Steg 2/3, Minor Maint Workshop
3: Ok, Complex LRU replacement, 6 h, AU Steg 4, Major Maint Workshop
4: Ok, Direct repair, 16 h, Kompositrep, Major Maint Workshop
5: fel, Felsökning liten, 4 h, FK steg 1–3, Service Bay
6: fel, Felsökning liten, 4 h, FK steg 1–3, Service Bay
B. Reception / post-mission
1: OK, Wheel replacement, 2 h, Hjulbytesförmåga, Service Bay
2: OK, Quick LRU replacement, 2 h, AU Steg 1, Service Bay
3: OK, Quick LRU replacement, 2 h, AU Steg 2/3, Minor Maint Workshop
4: OK, Complex LRU replacement, 6 h, AU Steg 4, Major Maint Workshop
5: Avhj, Direct repair, 16 h, Kompositrep, Major Maint Workshop
6: Avhj, Felsökning liten, 4 h, FK steg 1–3, Service Bay
C. Weapon loss
By outcome 1–6:
10%
30%
50%
70%
90%
100%
D. Extra time on maintenance
Added to nominal time by outcome 1–6:
0%
0%
0%
10%
20%
50%
E. Service types
A = 5 days
B = 8 days
C = 20 days
This table is directly usable as a probability / dice-result table in software, though some headings are a bit odd and should be checked with an SME before you lock the interpretation. (p. 11)
12. Fleet-management state variables
The fleet-management slide says to update after every turn:
consumed flight time
red/green aircraft status
resources
resource, time, and place for heavy maintenance
It also shows an example “time to 100 flight hours” table:
Fpl 5: 10
Fpl 3: 20
Fpl 10: 29
Fpl 9: 36
Fpl 7: 41
Fpl 4: 54
Fpl 2: 67
Fpl 8: 78
Fpl 6: 84
Fpl 1: 93
That is a strong hint that each aircraft object should carry:
flight hours consumed
hours to next threshold
current status
location
assigned mission
pending maintenance
required facility level
heavy-maintenance booking data (p. 13)
13. Scenario 1 data you can seed directly
The 7-day scenario provides a starting campaign structure:
Day 1: Fred
Day 2: Kris
Day 3: Kris
Day 4: Kris, CM attack
Day 5: Krig, Risk för TBM attack
Day 6: Krig
Day 7: Krig
The scenario uses these base labels:
MOB
FOB N
FOB S
ROB N
ROB S
ROB E
Visible aircraft packages in the scenario include:
18 × Gripen E
6 × Gripen F/EA
2 × GlobalEye
4 × VLO/UCAV
2 × LOTUS
12 × Gripen E + 2 × LOTUS
10 × Gripen E + 2 × LOTUS
6 × Gripen E + 6 × Gripen F/EA + 4 × VLO/UCAV
2 × Gripen E at ROB N on repeated days
Mission demand shown includes:
QRA: 2 × Gripen E, H24
DCA: 2–4 × Gripen E, H24
attack package: 4 × Gripen E + 2 × Gripen F/EA + 2 × VLO/UCAV, AI/ST, 2 times per day
RECCE: 1 × LOTUS, 2 × 8 h/day, plus 2 × Gripen E, 4 times/day
AEW: 1 × GlobalEye, H24
The exact day-by-day mapping of some cells is a bit visually messy in the PDF, but the mission packages and escalation structure are clear enough to seed a scenario database. (p. 5)
14. Extra scenario / rule constraints
There are a few smaller but useful rule hooks:
AOC card asks to report availability
extra “breadth tasks” / additional tasks can be injected
one card says “Plundring får ej ske” — cannibalization not allowed
higher controller can demand resource updates and base-availability updates
That gives you a nice mechanism for:
scenario modifiers
policy cards
random events
command-injected tasks
restrictions that vary by scenario (p. 14)
15. Suggested object model for the program
A clean software representation from this deck would be:
Base
id, type, location/group, role, open hours, maintenance slots, storage, fuel, ammo, UE, personnel, tools
Aircraft
id, type, current base, status, flight hours, time to next threshold, payload, fuel state, assigned mission, maintenance need
MissionDemand / ATO Line
mission type, start window, frequency, package, launch base, payload, priority
MaintenanceTask
aircraft, fault type, facility needed, capability needed, nominal time, stochastic delay, required resources
ResourceStock
type, quantity, reserved quantity, lead time, source, destination, turnaround
Event
takeoff, landing, rearm, refuel, transfer, maintenance complete, resupply arrival, scenario attack, policy change
DecisionAgent
AOC, base command, maintenance planner, prep team logic
Scenario
day phase, threats, base posture, mission schedule, policy restrictions
16. Important gaps you’ll need to fill yourself
The deck is useful, but not complete. These are still missing or only partially specified:
exact probabilities behind the dice outcomes
mission durations for most mission types
travel / transfer times between named bases
exact manpower counts and skill distributions
exact definitions of AU/FK/O-BAS/T-BAS abbreviations
fuel consumption rates
weapon consumption by mission type
sortie generation times by aircraft type
precise front/rear maintenance capacities
damage / attack effects from CM or TBM attacks
whether aircraft counts in the scenario are initial disposition, daily availability, or both
So the deck is best used as a simulation framework + starter dataset, not as a full parameter set.
The next most useful step is to turn this into a machine-readable JSON schema plus event/state tables before you start coding the simulation engine.


Most actionable information

The game is based upon an internal simulation of plane allocation at a saab airbase.
We want to build this game virtually, following the most important data. 
The game should be modelled stochastically with different probabilities for different outcomes during each turn.


If a stochastic outcome is negative or presents a deviation from the users plan the user should be presented with all relevant data and a “recommended” choice based upon the data and an optimized simulation. We want this app to be as actionable as possible. Main focus should be on functionality and data displayed.

The user should be able to provide input based upon ATO and gantt diagrams. This input should be able to be provided continuously throughout the game. The game should also recommend changes to the ATO and gantt diagrams throughout the game. 
The amount of resources and personel should be set to a default value for each player at the start of the round.


