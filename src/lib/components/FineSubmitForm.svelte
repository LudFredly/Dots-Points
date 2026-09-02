<script lang="ts">
  import confetti from "canvas-confetti";
  import { CheckCircle2, AlertCircle, User, FileText, Check, ShieldAlert } from "lucide-svelte";
  import type { Person, FineRule, FineReport, OccasionType } from "$lib/types";
  import { getPublicDisplayName } from "$lib/utils/nameHelper";
  import { getRuleFineForOccasion, isRuleApplicableForOccasion } from "$lib/utils/store";

  let {
    persons = [],
    rules = [],
    onSubmitFine
  }: {
    persons: Person[];
    rules: FineRule[];
    onSubmitFine: (report: Omit<FineReport, "id" | "date">) => Promise<void>;
  } = $props();

  // Split into players and coaches
  const players = $derived(persons.filter(p => p.type === "player"));
  const coaches = $derived(persons.filter(p => p.type === "coach"));

  // Form State
  let selectedPersonId = $state("");
  let eventContext = $state<OccasionType>("Practice"); // Occasion comes before violations, required
  let selectedRuleIds = $state<string[]>([]);
  let customOtherViolation = $state(""); // When "Other" occasion is selected, user writes their own violation with no amount
  let customComment = $state("");
  let reportedBy = $state("");

  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let successMessage = $state("");

  // Occasions list: "Match", "Practice", "Social", "Other".
  const OCCASIONS: Array<{ id: OccasionType; label: string; desc: string }> = [
    { id: "Practice", label: "Practice", desc: "Training & drills" },
    { id: "Match", label: "Match", desc: "Home & away games" },
    { id: "Social", label: "Social", desc: "Trips & team gatherings" },
    { id: "Other", label: "Other", desc: "Custom violation (admin sets amount)" }
  ];

  // Dynamic filtering & sorting of rules strictly for the active occasion
  // If an override is empty / not set, the rule does NOT show up for that occasion
  const applicableRules = $derived(
    rules
      .filter(rule => isRuleApplicableForOccasion(rule, eventContext))
      .sort((a, b) => {
        const fineA = getRuleFineForOccasion(a, eventContext);
        const fineB = getRuleFineForOccasion(b, eventContext);
        if (fineA !== fineB) {
          return fineA - fineB;
        }
        return a.title.localeCompare(b.title);
      })
  );

  // Automatically prune selected rule IDs when switching occasions if a rule is not applicable to the new occasion
  $effect(() => {
    if (eventContext === "Other") {
      selectedRuleIds = [];
      return;
    }
    const validIds = new Set(applicableRules.map(r => r.id));
    if (selectedRuleIds.some(id => !validIds.has(id))) {
      selectedRuleIds = selectedRuleIds.filter(id => validIds.has(id));
    }
  });

  const selectedPerson = $derived(
    persons.find(p => p.id === selectedPersonId)
  );

  function toggleRule(id: string) {
    if (selectedRuleIds.includes(id)) {
      selectedRuleIds = selectedRuleIds.filter(item => item !== id);
    } else {
      selectedRuleIds = [...selectedRuleIds, id];
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!selectedPersonId) {
      errorMessage = "Please select who this fine applies to.";
      return;
    }

    if (!eventContext) {
      errorMessage = "Occasion / context is mandatory. Please select an occasion.";
      return;
    }

    if (eventContext !== "Other" && selectedRuleIds.length === 0) {
      errorMessage = "Please select at least one penalty rule violation.";
      return;
    }

    if (eventContext === "Other" && !customOtherViolation.trim() && selectedRuleIds.length === 0) {
      errorMessage = "Please describe the violation for admin review.";
      return;
    }

    const person = persons.find(p => p.id === selectedPersonId);
    if (!person) {
      errorMessage = "Invalid person selected.";
      return;
    }

    let ruleTitles: string[] = [];
    let calculatedFine = 0;

    if (eventContext === "Other") {
      if (customOtherViolation.trim()) {
        ruleTitles = [customOtherViolation.trim()];
      } else {
        ruleTitles = selectedRuleIds.map(id => {
          const r = rules.find(rule => rule.id === id);
          return r ? r.title : "";
        }).filter(Boolean);
      }
      // For "Other", amount is left at 0 for admin to set and approve later
      calculatedFine = 0;
    } else {
      ruleTitles = selectedRuleIds.map(id => {
        const r = rules.find(rule => rule.id === id);
        if (!r) return "";
        const cost = getRuleFineForOccasion(r, eventContext);
        return `${r.title} (${cost} kr)`;
      }).filter(Boolean);

      for (const id of selectedRuleIds) {
        const r = rules.find(rule => rule.id === id);
        if (r) {
          calculatedFine += getRuleFineForOccasion(r, eventContext);
        }
      }
    }

    isSubmitting = true;
    try {
      const displayName = getPublicDisplayName(person, persons);

      await onSubmitFine({
        playerId: person.id,
        playerName: displayName,
        ruleIds: selectedRuleIds.length > 0 ? selectedRuleIds : ["custom-other"],
        ruleTitles,
        totalFine: calculatedFine,
        comment: customComment.trim(),
        reportedBy: reportedBy.trim() || "Teammate",
        eventContext,
        status: "pending",
        paid: false
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      if (eventContext === "Other") {
        successMessage = `Custom violation reported for ${displayName}. Admin will review and set the fine amount.`;
      } else {
        successMessage = `Fine for ${displayName} has been submitted for admin approval.`;
      }
      
      // Reset form
      selectedPersonId = "";
      selectedRuleIds = [];
      customOtherViolation = "";
      customComment = "";

      setTimeout(() => {
        successMessage = "";
      }, 6000);
    } catch (err) {
      errorMessage = "Failed to submit penalty fine. Please try again.";
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
  <!-- Card Header -->
  <div class="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold">
        <ShieldAlert class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
          Report Penalty Fine
        </h2>
        <p class="text-xs sm:text-sm text-slate-400">
          Select person, choose occasion, tick rule violations, and log to the team pool.
        </p>
      </div>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="p-5 sm:p-6 space-y-6">
    <!-- Success Banner -->
    {#if successMessage}
      <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs sm:text-sm">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
        <span class="font-medium">{successMessage}</span>
      </div>
    {/if}

    <!-- Error Banner -->
    {#if errorMessage}
      <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-900 text-xs sm:text-sm">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0" />
        <span class="font-medium">{errorMessage}</span>
      </div>
    {/if}

    <!-- STEP 1: Select Person -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="fine-person-select" class="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <User class="w-4 h-4 text-emerald-700" />
          <span>1. Who committed the violation?</span>
          <span class="text-rose-500 font-bold">*</span>
        </label>

        {#if selectedPerson}
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {selectedPerson.role || (selectedPerson.type === "coach" ? "Coach" : "Player")}
            {#if selectedPerson.number}
              #{selectedPerson.number}
            {/if}
          </span>
        {/if}
      </div>

      <div class="relative">
        <select
          id="fine-person-select"
          bind:value={selectedPersonId}
          class="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-200 rounded-xl text-slate-900 font-medium text-xs sm:text-sm transition-all appearance-none cursor-pointer pr-10 shadow-2xs"
        >
          <option value="" disabled selected>-- Select player or coach --</option>
          <optgroup label="Players (Alphabetical)">
            {#each players as p}
              <option value={p.id}>
                {getPublicDisplayName(p, persons)} {p.number ? `(#${p.number})` : ""} - {p.role || "Player"}
              </option>
            {/each}
          </optgroup>
          {#if coaches.length > 0}
            <optgroup label="Coaches & Staff">
              {#each coaches as c}
                <option value={c.id}>
                  {getPublicDisplayName(c, persons)} - {c.role || "Coach"}
                </option>
              {/each}
            </optgroup>
          {/if}
        </select>
        <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>
    </div>

    <!-- STEP 2: Occasion / Context (Mandatory; Determines fine amounts and rules sorting) -->
    <div class="space-y-2.5 pt-3 border-t border-slate-100">
      <div class="flex items-center justify-between">
        <label for="occasion-group" class="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>2. Occasion / Context</span>
          <span class="text-rose-500 font-bold">*</span>
          <span class="text-xs font-normal text-slate-500 ml-1.5">(mandatory — determines rates and sorting)</span>
        </label>
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          Selected: {eventContext}
        </span>
      </div>

      <div id="occasion-group" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each OCCASIONS as occ}
          {@const isSelected = eventContext === occ.id}
          <button
            type="button"
            onclick={() => eventContext = occ.id}
            class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between {isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'}"
          >
            <div>
              <div class="font-bold text-xs sm:text-sm flex items-center justify-between">
                <span>{occ.label}</span>
                {#if isSelected}
                  <Check class="w-3.5 h-3.5 text-emerald-400" />
                {/if}
              </div>
              <p class="text-[11px] mt-0.5 {isSelected ? 'text-slate-300' : 'text-slate-500'}">
                {occ.desc}
              </p>
            </div>
          </button>
        {/each}
      </div>

      <!-- STEP 3 for "Other" Occasion: Custom written violation, no amount specified (admin will approve and set amount) -->
      {#if eventContext === "Other"}
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div>
            <label for="other-custom-violation" class="block text-xs font-bold text-slate-800 mb-1">
              Custom Violation / Incident Description *
            </label>
            <p class="text-slate-500 text-xs mb-2">
              Write what happened below, a fine will be decided later.
            </p>
            <textarea
              id="other-custom-violation"
              rows="2"
              placeholder="e.g. Forgot balls at the hall after private scrimmage..."
              bind:value={customOtherViolation}
              class="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400"
            ></textarea>
          </div>
        </div>
      {/if}
    </div>

    <!-- STEP 3: Multi-select Penalty Rules (Shown for Practice, Match, Social; sorted strictly by active occasion price) -->
    {#if eventContext !== "Other"}
      <div class="space-y-2.5 pt-3 border-t border-slate-100">
        <div class="flex items-center justify-between">
          <div class="text-xs sm:text-sm font-bold text-slate-800">
            <span>3. Select Violation(s)</span>
            <span class="text-rose-500 font-bold">*</span>
          </div>
          {#if selectedRuleIds.length > 0}
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {selectedRuleIds.length} selected
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {#if applicableRules.length === 0}
            <div class="sm:col-span-2 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-500 text-xs">
              No specific penalty violations are registered for <span class="font-bold text-slate-700">{eventContext}</span>.
              You can report a custom violation under <span class="font-bold text-slate-700">Other</span>.
            </div>
          {:else}
            {#each applicableRules as rule}
              {@const isChecked = selectedRuleIds.includes(rule.id)}
              {@const price = getRuleFineForOccasion(rule, eventContext)}
              {@const hasOccasionSpecificPrice = (eventContext === "Match" && rule.fineMatch != null) || (eventContext === "Practice" && rule.finePractice != null) || (eventContext === "Social" && rule.fineSocial != null)}
              
              <button
                type="button"
                onclick={() => toggleRule(rule.id)}
                class="p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer {isChecked ? 'bg-emerald-50/90 border-emerald-600 ring-1 ring-emerald-600 shadow-2xs' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'}"
              >
                <div class="flex items-start gap-2.5 min-w-0">
                  <!-- Checkbox indicator -->
                  <div class="w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all {isChecked ? 'bg-emerald-700 border-emerald-700 text-white' : 'border-slate-300 bg-white'}">
                    {#if isChecked}
                      <Check class="w-3 h-3 stroke-[3]" />
                    {/if}
                  </div>

                  <div class="min-w-0">
                    <div class="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {rule.title}
                    </div>
                    {#if rule.description}
                      <div class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {rule.description}
                      </div>
                    {/if}
                    {#if hasOccasionSpecificPrice}
                      <div class="flex items-center gap-1.5 mt-1">
                        <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          {eventContext}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Fine Badge -->
                <div class="shrink-0 font-extrabold text-xs sm:text-sm px-2 py-1 rounded-md border {isChecked ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-slate-100 text-slate-800 border-slate-200'}">
                  {price} kr
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}

    <!-- STEP 4: Context & Details -->
    <div class="space-y-4 pt-3 border-t border-slate-100">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Reported By -->
        <div>
          <label for="reporter-name" class="block text-xs font-bold text-slate-700 mb-1.5">
            Reported By (optional)
          </label>
          <input
            id="reporter-name"
            type="text"
            placeholder="Your name"
            bind:value={reportedBy}
            class="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-200 text-slate-800"
          />
        </div>

        <!-- Incident Comment / Note -->
        <div>
          <label for="fine-comment" class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <FileText class="w-3.5 h-3.5 text-slate-500" />
            <span>Additional Note (optional)</span>
          </label>
          <input
            id="fine-comment"
            type="text"
            placeholder="e.g. 'Arrived 15 minutes late without notice'"
            bind:value={customComment}
            class="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-200 text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>

    <!-- Clean Submit Bar with Just "Submit Fine" button (no fine for selected person display to avoid going easy) -->
    <div class="pt-2 flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting || !selectedPersonId || !eventContext || (eventContext !== 'Other' && selectedRuleIds.length === 0) || (eventContext === 'Other' && !customOtherViolation.trim() && selectedRuleIds.length === 0)}
        class="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-sm cursor-pointer text-center"
      >
        {#if isSubmitting}
          Submitting...
        {:else}
          Submit Fine
        {/if}
      </button>
    </div>
  </form>
</div>
