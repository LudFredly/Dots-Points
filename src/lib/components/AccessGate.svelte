<script lang="ts">
  import { onMount } from "svelte";
  import { Shield, KeyRound, ArrowRight, AlertCircle, Lock, ShieldAlert } from "lucide-svelte";
  import { h4aStore } from "$lib/utils/store";

  let { onUnlocked }: { onUnlocked?: () => void } = $props();

  let inputKey = $state("");
  let errorMessage = $state("");
  let isChecking = $state(false);

  onMount(() => {
    if (h4aStore.checkAccess()) {
      onUnlocked?.();
    }
  });

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";
    isChecking = true;

    try {
      const ok = h4aStore.verifyAndGrantAccess(inputKey);
      if (ok) {
        onUnlocked?.();
      } else {
        errorMessage = "Feil tilgangsnøkkel. Kontroller nøkkelen og prøv på nytt.";
      }
    } catch (err: any) {
      errorMessage = err.message || "Kunne ikke verifisere nøkkelen.";
    } finally {
      isChecking = false;
    }
  }
</script>

<div class="min-h-[85vh] flex items-center justify-center p-4">
  <div class="bg-white w-full max-w-md rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 text-center">
    <!-- Header Icon -->
    <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-inner">
      <Shield class="w-8 h-8" />
    </div>

    <!-- Title & Info -->
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
        {h4aStore.settings?.teamName || "H4A"} {h4aStore.settings?.season || "26/27"}
      </h2>
      <p class="text-xs sm:text-sm font-semibold text-emerald-600 uppercase tracking-wider mt-0.5">
        Botekasse & Dugnadsportal
      </p>
      <p class="text-xs sm:text-sm text-slate-500 mt-2">
        Portalen er lukket for allmennheten. Oppgi lagets tilgangsnøkkel (<span class="font-mono text-slate-700 font-semibold">ACCESS_KEY</span>) for å åpne siden.
      </p>
    </div>

    {#if errorMessage}
      <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 text-left">
        <AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Key Entry Form -->
    <form onsubmit={handleSubmit} class="space-y-4 text-left">
      <div>
        <label for="portal-key-input" class="block text-xs font-bold text-slate-700 mb-1.5">
          Lagets tilgangsnøkkel
        </label>
        <div class="relative">
          <input
            id="portal-key-input"
            type="password"
            placeholder="Tast inn ACCESS_KEY..."
            bind:value={inputKey}
            required
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 rounded-xl text-slate-900 font-mono text-sm pr-10 transition-all"
          />
          <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <KeyRound class="w-4 h-4" />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isChecking}
        class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-emerald-400 font-black rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
      >
        <span>Åpne portalen</span>
        <ArrowRight class="w-4 h-4" />
      </button>
    </form>

    <!-- Footer Help -->
    <div class="pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-xs text-slate-400">
      <p>
        Har du ikke nøkkelen? Spør lagkaptein eller kasserer på Spond/chat.
      </p>
    </div>
  </div>
</div>
