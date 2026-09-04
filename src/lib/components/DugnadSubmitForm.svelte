<script lang="ts">
  import confetti from "canvas-confetti";
  import {
    HeartHandshake,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    User,
    Clock,
    FileText,
    Navigation
  } from "lucide-svelte";
  import type { Person, DugnadEntry, DugnadActivity } from "$lib/types";
  import { getPublicDisplayName } from "$lib/utils/nameHelper";
  import { DEFAULT_DUGNAD_ACTIVITIES } from "$lib/utils/store";

  let {
    persons = [],
    activities = DEFAULT_DUGNAD_ACTIVITIES,
    onSubmitDugnad
  }: {
    persons: Person[];
    activities?: DugnadActivity[];
    onSubmitDugnad: (entry: Omit<DugnadEntry, "id" | "date" | "status">) => Promise<void>;
  } = $props();

  const players = $derived(persons.filter(p => p.type === "player"));
  const effectiveActivities = $derived(activities.length > 0 ? activities : DEFAULT_DUGNAD_ACTIVITIES);

  let selectedPlayerId = $state("");
  let selectedActivity = $state(DEFAULT_DUGNAD_ACTIVITIES[0].title);
  let customActivityTitle = $state("");
  let hours = $state(2.0);
  let hadTravel = $state(false);
  let travelHours = $state(1.0);
  let comment = $state("");

  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let successMessage = $state("");

  // Keep selectedActivity valid if activities change
  $effect(() => {
    if (effectiveActivities.length > 0 && !effectiveActivities.some(a => a.title === selectedActivity)) {
      selectedActivity = effectiveActivities[0].title;
      hours = effectiveActivities[0].defaultHours;
    }
  });

  const activeActivityObj = $derived(
    effectiveActivities.find(a => a.title === selectedActivity)
  );

  const dutyPoints = $derived(
    activeActivityObj
      ? activeActivityObj.pointsType === "fixed"
        ? activeActivityObj.pointsPer
        : Number((hours * activeActivityObj.pointsPer).toFixed(1))
      : 0
  );

  const travelPoints = $derived(
    hadTravel ? Number((Math.max(0, travelHours) * 5).toFixed(1)) : 0
  );

  const totalCalculatedPoints = $derived(
    Number((dutyPoints + travelPoints).toFixed(1))
  );

  const totalCalculatedHours = $derived(
    Number((hours + (hadTravel ? Math.max(0, travelHours) : 0)).toFixed(1))
  );

  const selectedPlayer = $derived(
    players.find(p => p.id === selectedPlayerId)
  );

  function handleActivityChange(title: string) {
    selectedActivity = title;
    const act = effectiveActivities.find(a => a.title === title);
    if (act) {
      hours = act.defaultHours;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!selectedPlayerId) {
      errorMessage = "Please select the person who performed the club duty.";
      return;
    }

    if (hours <= 0) {
      errorMessage = "Please enter valid duty hours (greater than 0).";
      return;
    }

    if (hadTravel && travelHours <= 0) {
      errorMessage = "Please enter valid travel hours (greater than 0).";
      return;
    }

    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) {
      errorMessage = "Invalid person selected.";
      return;
    }

    const activityName = selectedActivity === "Other / Special Assignment" && customActivityTitle.trim()
      ? customActivityTitle.trim()
      : selectedActivity;

    isSubmitting = true;
    try {
      const displayName = getPublicDisplayName(player, persons);

      await onSubmitDugnad({
        playerId: player.id,
        playerName: displayName,
        activityType: activityName,
        hours: totalCalculatedHours,
        points: totalCalculatedPoints,
        dutyHours: Number(hours),
        dutyPoints: dutyPoints,
        hadTravel: hadTravel,
        travelHours: hadTravel ? Number(travelHours) : 0,
        travelPoints: travelPoints,
        comment: comment.trim(),
        reportedBy: displayName
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      successMessage = `Club duty for ${displayName} (${totalCalculatedHours} hrs • ${totalCalculatedPoints} pts) has been submitted for admin approval.`;
      
      // Reset fields
      selectedPlayerId = "";
      comment = "";
      customActivityTitle = "";
      hadTravel = false;
      travelHours = 1.0;

      setTimeout(() => {
        successMessage = "";
      }, 5000);
    } catch (err) {
      errorMessage = "Failed to log club duty. Please try again.";
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
      <div class="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold">
        <HeartHandshake class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
          Log Club Duty
        </h2>
        <p class="text-xs sm:text-sm text-slate-400">
          Record event hosting, kiosk shifts, hall rigging, and duty travel.
        </p>
      </div>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="p-5 sm:p-6 space-y-6">
    <!-- Success Banner -->
    {#if successMessage}
      <div class="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-teal-900 text-xs sm:text-sm">
        <CheckCircle2 class="w-5 h-5 text-teal-600 shrink-0" />
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

    <!-- Step 1: Select Player -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="dugnad-player-select" class="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <User class="w-4 h-4 text-teal-700" />
          <span>1. Who performed the club duty?</span>
          <span class="text-rose-500 font-bold">*</span>
        </label>

        {#if selectedPlayer}
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {selectedPlayer.role || "Player"}
            {#if selectedPlayer.number}
              #{selectedPlayer.number}
            {/if}
          </span>
        {/if}
      </div>

      <div class="relative">
        <select
          id="dugnad-player-select"
          bind:value={selectedPlayerId}
          class="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-200 rounded-xl text-slate-900 font-medium text-xs sm:text-sm transition-all appearance-none cursor-pointer pr-10 shadow-2xs"
        >
          <option value="" disabled selected>-- Select player --</option>
          {#each players as p}
            <option value={p.id}>
              {getPublicDisplayName(p, persons)} {p.number ? `(#${p.number})` : ""} - {p.role || "Player"}
            </option>
          {/each}
        </select>
        <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>
    </div>

    <!-- Step 2: Activity Selection -->
    <div class="space-y-2 pt-3 border-t border-slate-100">
      <div class="text-xs sm:text-sm font-bold text-slate-800">
        <span>2. Choose Duty Activity</span>
        <span class="text-rose-500 font-bold">*</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each effectiveActivities as act}
          {@const isSelected = selectedActivity === act.title}
          <button
            type="button"
            onclick={() => handleActivityChange(act.title)}
            class="p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer {isSelected ? 'bg-teal-50/90 border-teal-600 ring-1 ring-teal-600 shadow-2xs' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'}"
          >
            <div class="min-w-0">
              <div class="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {act.title}
              </div>
            </div>

            <div class="shrink-0 text-xs font-semibold px-2 py-1 rounded-md border {isSelected ? 'bg-teal-700 text-white border-teal-800' : 'bg-slate-100 text-slate-700 border-slate-200'}">
              {act.pointsPer} pts/hr
            </div>
          </button>
        {/each}
      </div>

      {#if selectedActivity.includes("Other")}
        <div class="pt-2">
          <input
            type="text"
            placeholder="Describe the duty performed..."
            bind:value={customActivityTitle}
            class="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-200 text-slate-800"
          />
        </div>
      {/if}
    </div>

    <!-- Step 3: Hours & Travel -->
    <div class="space-y-4 pt-3 border-t border-slate-100">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Duty Hours Input -->
        <div class="space-y-1.5">
          <label for="hours-input" class="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Clock class="w-3.5 h-3.5 text-teal-700" />
            <span>Duty Hours Worked</span>
          </label>
          <div class="relative">
            <input
              id="hours-input"
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              bind:value={hours}
              class="w-full h-10 pl-3.5 pr-24 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-teal-200"
            />
            <span class="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none select-none">
              hours
            </span>
          </div>
        </div>

        <!-- Duty Points (Calculated) -->
        <div class="space-y-1.5">
          <div class="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Sparkles class="w-3.5 h-3.5 text-teal-600" />
            <span>Duty Points</span>
          </div>
          <div class="h-10 px-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-teal-950 font-black text-sm">
            <span>{dutyPoints}</span>
            <span class="text-xs font-medium text-teal-800">points ({activeActivityObj?.pointsPer || 10} pts/hr)</span>
          </div>
        </div>
      </div>

      <!-- Travel Specific Option -->
      <div class="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div class="flex items-center gap-2">
            <Navigation class="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div class="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                I had to travel specifically to/from this club duty
              </div>
              <div class="text-[11px] text-slate-500">
                Earn 5 pts per hour of required duty travel
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onclick={() => hadTravel = false}
              class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer {!hadTravel ? 'bg-slate-800 text-white border-slate-900 shadow-2xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}"
            >
              No
            </button>
            <button
              type="button"
              onclick={() => hadTravel = true}
              class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer {hadTravel ? 'bg-teal-600 text-white border-teal-700 shadow-2xs' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}"
            >
              Yes
            </button>
          </div>
        </div>

        {#if hadTravel}
          <div class="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label for="travel-hours-input" class="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock class="w-3.5 h-3.5 text-sky-600" />
                <span>Travel Hours</span>
              </label>
              <div class="relative">
                <input
                  id="travel-hours-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  bind:value={travelHours}
                  class="w-full h-10 pl-3.5 pr-24 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:ring-2 focus:ring-sky-200"
                />
                <span class="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none select-none">
                  hours
                </span>
              </div>
            </div>

            <div class="space-y-1">
              <div class="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles class="w-3.5 h-3.5 text-sky-600" />
                <span>Travel Points Earned</span>
              </div>
              <div class="h-10 px-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-sky-950 font-black text-sm">
                <span>+{travelPoints}</span>
                <span class="text-xs font-medium text-sky-800">5 pts/hr</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Comment -->
      <div>
        <label for="dugnad-comment" class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
          <FileText class="w-3.5 h-3.5 text-slate-500" />
          <span>Notes / Description (optional)</span>
        </label>
        <input
          id="dugnad-comment"
          type="text"
          placeholder="e.g. 'Ran kiosk during match vs OSI'"
          bind:value={comment}
          class="w-full h-10 px-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-200 text-slate-800"
        />
      </div>
    </div>

    <!-- Live Total & Submit Bar -->
    <div class="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-slate-800">
      <div>
        <div class="text-xs text-slate-400 font-medium">
          Club duty record for {selectedPlayer ? getPublicDisplayName(selectedPlayer, persons) : "selected player"}:
        </div>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {totalCalculatedPoints} total points
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !selectedPlayerId || hours <= 0 || (hadTravel && travelHours <= 0)}
        class="w-full sm:w-auto px-6 py-2.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
      >
        {#if isSubmitting}
          <div class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          <span>Saving...</span>
        {:else}
          <HeartHandshake class="w-4 h-4" />
          <span>Log Club Duty</span>
        {/if}
      </button>
    </div>
  </form>
</div>
