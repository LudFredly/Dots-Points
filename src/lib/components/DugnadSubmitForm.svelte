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

  const effectiveActivities = $derived(
    [...(activities.length > 0 ? activities : DEFAULT_DUGNAD_ACTIVITIES)]
      .sort((a, b) => {
        // Per-hour activities first, sorted by points/hour descending
        if (a.pointsType !== b.pointsType) {
          return a.pointsType === "perHour" ? -1 : 1;
        }

        // Within each type, highest points first
        return b.pointsPer - a.pointsPer;
      })
  );

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
    if (
      effectiveActivities.length > 0 &&
      !effectiveActivities.some(a => a.title === selectedActivity)
    ) {
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
    hadTravel ? Number((Math.max(0, travelHours) * 4).toFixed(1)) : 0
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

  function formatHours(value: number): string {
    const totalMinutes = Math.round(value * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (wholeHours === 0) return `${minutes} min`;
    if (minutes === 0) return `${wholeHours} hr`;
    return `${wholeHours} hr, ${minutes} min`;
  }

  function adjustHours(delta: number) {
    hours = Math.min(24, Math.max(0.25, Number((hours + delta).toFixed(2))));
  }

  function adjustTravelHours(amount: number) {
    travelHours = Math.min(
      24,
      Math.max(0.25, Number((travelHours + amount).toFixed(2)))
    );
  }

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

    const activityName =
      selectedActivity === "Other / Special Assignment" &&
      customActivityTitle.trim()
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

<div class="bg-white rounded-2xl shadow-xs border-1 border-[var(--ntnui-black-dark)] overflow-hidden">

  <!-- Card Header -->
  <div class="bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] p-5 sm:p-6">
    <div class="flex items-center justify-center gap-3 text-center">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-[var(--ntnui-black-dark)] tracking-tight">
          Log Club Duty
        </h2>

        <p class="text-sm sm:text-base text-[var(--ntnui-black-dark)]/85">
          Record work that has been performed for the team/club.
        </p>
      </div>
    </div>
  </div>

  <form onsubmit={handleSubmit} class="p-5 sm:p-6 space-y-6">

    <!-- Success Banner -->
    {#if successMessage}
      <div class="p-4 bg-[var(--ntnui-green)]/10 border border-[var(--ntnui-green)]/30 rounded-xl flex items-center gap-3 text-[var(--ntnui-green)] text-xs sm:text-sm">
        <CheckCircle2 class="w-5 h-5 text-[var(--ntnui-green)] shrink-0" />
        <span class="font-medium">{successMessage}</span>
      </div>
    {/if}

    <!-- Error Banner -->
    {#if errorMessage}
      <div class="p-4 bg-[var(--ntnui-red)]/10 border border-[var(--ntnui-red)]/30 rounded-xl flex items-center gap-3 text-[var(--ntnui-red)] text-xs sm:text-sm">
        <AlertCircle class="w-5 h-5 text-[var(--ntnui-red)] shrink-0" />
        <span class="font-medium">{errorMessage}</span>
      </div>
    {/if}

    <!-- Step 1: Select Player -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label
          for="dugnad-player-select"
          class="text-xs sm:text-sm font-bold text-[var(--ntnui-black-dark)] flex items-center gap-1.5"
        >
          <span>1. Who performed the club duty?</span>
          <span class="text-[var(--ntnui-red)] font-bold">*</span>
        </label>
      </div>

      <div class="relative">
        <select
          id="dugnad-player-select"
          bind:value={selectedPlayerId}
          class="w-full h-11 px-3.5 bg-[var(--ntnui-black)]/5 border border-[var(--ntnui-black)]/30 focus:border-[var(--ntnui-green)] focus:bg-white focus:outline-none focus:ring-0 rounded-xl text-[var(--ntnui-black-dark)] font-medium text-xs sm:text-sm transition-all appearance-none cursor-pointer pr-10 shadow-2xs"
        >
          <option value="" disabled selected>-- Select player --</option>

          {#each players as p}
            <option value={p.id}>
              {getPublicDisplayName(p, persons)}
              {p.number ? ` (#${p.number})` : ""}
              - {p.role || "Player"}
            </option>
          {/each}
        </select>

        <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ntnui-black-light)]/70 text-xs">
          ▼
        </div>
      </div>
    </div>

    <!-- Step 2: Activity Selection -->
    <div class="space-y-2 pt-3 border-t border-[var(--ntnui-black)]/10">

      <div class="text-xs sm:text-sm font-bold text-[var(--ntnui-black-dark)]">
        <span>2. Choose Duty Activity</span>
        <span class="text-[var(--ntnui-red)] font-bold">*</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">

        {#each effectiveActivities as act}
          {@const isSelected = selectedActivity === act.title}

          <button
            type="button"
            onclick={() => handleActivityChange(act.title)}
            class="p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer {isSelected
              ? 'bg-[var(--ntnui-green)]/10 border-[var(--ntnui-green)] ring-1 ring-[var(--ntnui-green)] shadow-2xs'
              : 'bg-white border-[var(--ntnui-black)]/30 hover:border-[var(--ntnui-black)]/40 hover:bg-[var(--ntnui-green)]/10'}"
          >
            <div class="min-w-0">
              <div class="text-xs sm:text-sm font-bold text-[var(--ntnui-black-dark)] leading-tight">
                {act.title}
              </div>
            </div>

            <div
              class="shrink-0 text-xs font-semibold px-2 py-1 rounded-md border {isSelected
                ? 'bg-[var(--ntnui-green)] text-white border-[var(--ntnui-green)]'
                : 'bg-[var(--ntnui-black)]/5 text-[var(--ntnui-black-dark)] border-[var(--ntnui-black)]/15'}"
            >
              {act.pointsPer} {act.pointsType === "fixed" ? "pts" : "pts/hr"}
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
            class="w-full px-3 py-2 text-xs sm:text-sm bg-[var(--ntnui-black)]/5 border border-[var(--ntnui-black)]/30 rounded-xl focus:bg-white focus:outline-none focus:border-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] placeholder:text-[var(--ntnui-black-light)]/70"
          />
        </div>
      {/if}

    </div>

    <!-- Step 3: Hours & Travel -->
    <div class="space-y-4 pt-3 border-t border-[var(--ntnui-black)]/10">

      <div
        class:grid-cols-1={activeActivityObj?.pointsType === "fixed"}
        class:grid-cols-2={activeActivityObj?.pointsType !== "fixed"}
        class="grid gap-4"
      >

        {#if activeActivityObj?.pointsType !== "fixed"}

          <!-- Duty Hours Input -->
          <div class="space-y-1.5">
            <label
              for="hours-input"
              class="text-xs font-bold text-[var(--ntnui-black-dark)] flex items-center gap-1"
            >
              <span>Duty Hours Worked</span>
            </label>

            <div class="relative">
              <div
                id="hours-input"
                class="w-full h-10 px-3.5 pr-10 bg-white border border-[var(--ntnui-black)]/30 rounded-xl text-[var(--ntnui-black-dark)] font-bold text-sm flex items-center"
                aria-label="Duty Hours Worked"
                role="spinbutton"
                aria-valuemin="0.25"
                aria-valuemax="24"
                aria-valuenow={hours}
              >
                {formatHours(hours)}
              </div>

              <div class="absolute right-1 top-1 bottom-1 flex flex-col">
                <button
                  type="button"
                  onclick={() => adjustHours(0.25)}
                  class="flex-1 w-8 flex items-center justify-center rounded-t-lg text-xs text-[var(--ntnui-black-light)]/70 hover:bg-[var(--ntnui-green)]/10 hover:text-[var(--ntnui-green)] active:bg-[var(--ntnui-green)]/20 cursor-pointer"
                  aria-label="Increase duty hours by 15 minutes"
                >
                  ▲
                </button>

                <button
                  type="button"
                  onclick={() => adjustHours(-0.25)}
                  class="flex-1 w-8 flex items-center justify-center rounded-b-lg text-xs text-[var(--ntnui-black-light)]/70 hover:bg-[var(--ntnui-red)]/10 hover:text-[var(--ntnui-red)] active:bg-[var(--ntnui-red)]/20 cursor-pointer"
                  aria-label="Decrease duty hours by 15 minutes"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

        {/if}

        <!-- Duty Points -->
        <div class="space-y-1.5">
          <div class="text-xs font-bold text-[var(--ntnui-black-dark)] flex items-center gap-1">
            <span>Duty Points</span>
          </div>

          <div class="h-10 px-3 bg-white border border-[var(--ntnui-black)]/30 rounded-xl flex items-center justify-between text-[var(--ntnui-black)] font-black text-sm">
            <span>{dutyPoints}</span>
            <span class="text-xs font-medium text-[var(--ntnui-black)]/80">
              points
            </span>
          </div>
        </div>

      </div>

      {#if activeActivityObj?.pointsType !== "fixed"}

        <!-- Travel Specific Option -->
        <div class="bg-[var(--ntnui-yellow)]/10 border border-[var(--ntnui-yellow)]/30 rounded-xl p-3.5 sm:p-4 space-y-3">

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">

            <div class="flex items-center gap-2">
              <Navigation class="w-4 h-4 text-[var(--ntnui-black-dark)] shrink-0" />

              <div>
                <div class="text-xs sm:text-sm font-bold text-[var(--ntnui-black-dark)] leading-tight">
                  I had to travel specifically to/from this club duty
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">

              <button
                type="button"
                onclick={() => hadTravel = false}
                class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer {!hadTravel
                  ? 'bg-[var(--ntnui-yellow)]/30 text-[var(--ntnui-black-dark)] border-[var(--ntnui-yellow)] shadow-2xs'
                  : 'bg-white text-[var(--ntnui-black-dark)] border-[var(--ntnui-yellow)]/30 hover:bg-[var(--ntnui-yellow)]/5'}"
              >
                No
              </button>

              <button
                type="button"
                onclick={() => hadTravel = true}
                class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer {!hadTravel
                  ? 'bg-white text-[var(--ntnui-black-dark)] border-[var(--ntnui-yellow)]/30 hover:bg-[var(--ntnui-yellow)]/5'
                  : 'bg-[var(--ntnui-yellow)]/30 text-[var(--ntnui-black-dark)] border-[var(--ntnui-yellow)] shadow-2xs'}"
              >
                Yes
              </button>

            </div>
          </div>

          {#if hadTravel}

            <div class="pt-3 border-t border-[var(--ntnui-yellow)]/30 grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div class="space-y-1">

                <label
                  for="travel-hours-input"
                  class="text-xs font-bold text-[var(--ntnui-black-dark)] flex items-center gap-1"
                >
                  <span>Travel Hours</span>
                </label>

                <div class="relative">

                  <div class="relative">

                    <div class="w-full h-10 pl-3.5 pr-14 bg-white border border-[var(--ntnui-yellow)]/30 rounded-xl text-[var(--ntnui-black-dark)] font-bold text-sm flex items-center">
                      {formatHours(travelHours)}
                    </div>

                    <div class="absolute right-1 top-1 bottom-1 flex flex-col">

                      <button
                        type="button"
                        onclick={() => adjustTravelHours(0.25)}
                        class="flex-1 w-8 flex items-center justify-center rounded-t-lg text-xs text-[var(--ntnui-black-light)]/70 hover:bg-[var(--ntnui-yellow)]/10 hover:text-[var(--ntnui-black)] active:bg-[var(--ntnui-yellow)]/20 cursor-pointer"
                        aria-label="Increase travel hours by 15 minutes"
                      >
                        ▲
                      </button>

                      <button
                        type="button"
                        onclick={() => adjustTravelHours(-0.25)}
                        class="flex-1 w-8 flex items-center justify-center rounded-b-lg text-xs text-[var(--ntnui-black-light)]/70 hover:bg-[var(--ntnui-red)]/10 hover:text-[var(--ntnui-red)] active:bg-[var(--ntnui-red)]/20 cursor-pointer"
                        aria-label="Decrease travel hours by 15 minutes"
                      >
                        ▼
                      </button>

                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-1">

                <div class="text-xs font-bold text-[var(--ntnui-black-dark)] flex items-center gap-1">
                  <span>Travel Points</span>
                </div>

                <div class="h-10 px-3 bg-white border border-[var(--ntnui-yellow)]/40 rounded-xl flex items-center justify-between text-[var(--ntnui-black)] font-black text-sm">
                  <span>+{travelPoints}</span>
                  <span class="text-xs font-medium text-[var(--ntnui-black-light)]">
                    points
                  </span>
                </div>

              </div>

            </div>

          {/if}

        </div>

      {/if}

      <!-- Comment -->
      <div>
        <label
          for="dugnad-comment"
          class="block text-xs font-bold text-[var(--ntnui-black-dark)] mb-1.5 flex items-center gap-1"
        >
          <FileText class="w-3.5 h-3.5 text-[var(--ntnui-black-light)]" />
          <span>Notes / Description (optional)</span>
        </label>

        <input
          id="dugnad-comment"
          type="text"
          placeholder="e.g. 'Ran kiosk during match vs OSI'"
          bind:value={comment}
          class="w-full h-10 px-3.5 text-xs sm:text-sm bg-[var(--ntnui-black)]/5 border border-[var(--ntnui-black)]/30 rounded-xl focus:bg-white focus:outline-none focus:border-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] placeholder:text-[var(--ntnui-black-light)]/70"
        />
      </div>

    </div>

    <!-- Live Total & Submit Bar -->
    <div class="bg-white text-[var(--ntnui-black-dark)] p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-[var(--ntnui-black)]/30">

      <div>
        <div class="text-xs text-[var(--ntnui-black-dark)]/85 font-medium">
          Club duty record for
          {selectedPlayer
            ? getPublicDisplayName(selectedPlayer, persons)
            : "selected player"}:
        </div>

        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-2xl sm:text-3xl font-black tracking-tight text-[var(--ntnui-black-dark)]">
            {totalCalculatedPoints} Total Points
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !selectedPlayerId || hours <= 0 || (hadTravel && travelHours <= 0)}
        class="w-full sm:w-auto px-6 py-2.5 bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 active:bg-[var(--ntnui-green)]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
      >
        {#if isSubmitting}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Saving...</span>
        {:else}
          <span>Log Club Duty</span>
        {/if}
      </button>

    </div>

  </form>
</div>