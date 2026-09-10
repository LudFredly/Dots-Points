<script lang="ts">
    import { onMount } from "svelte";
    import { collection, getDocs } from "firebase/firestore/lite";

    let { database } = $props();

    let leaderboard: {name: string, fines_total: number}[] = $state([]);

    async function getLeaderboard() {
        try {
            const db_collection = collection(database, "prikk_approved");
            const db_snapshot = await getDocs(db_collection);

            const player_list = db_snapshot.docs.map((doc) => {
                const data = doc.data();

                const finesArray = Array.isArray(data.fines_nok) ? data.fines_nok : [];

                return {
                    name: data.name || "Unknown",
                    fines_total: finesArray.reduce(
                        (sum: number, fine: number) => sum + (Number(fine) || 0),
                        0
                    ),
                };
            });

            player_list.sort((a, b) => b.fines_total - a.fines_total);

            return player_list;
        } catch (err) {
            console.warn("Firestore not connected or error fetching leaderboard:", err);
            return [];
        }
    }

    onMount(async () => {
        leaderboard = await getLeaderboard();
    });
</script>

<div class="space-y-2">
    {#each leaderboard as player, index}
        <div
            class="rounded-2xl border p-4 flex items-center justify-between gap-4 shadow-xs
            {index === 0
                ? 'border-[var(--ntnui-red)]/40 bg-[var(--ntnui-red)]/5'
                : 'border-[var(--color-text)]/15 bg-[var(--color-surface)]'}"
        >
            <!-- Rank + Name -->
            <div class="flex items-center gap-4 min-w-0">
                <span
                    class="w-6 shrink-0 text-center font-bold text-xs text-[var(--color-text)]"
                >
                    #{index + 1}
                </span>

                <div class="min-w-0">
                    <div
                        class="font-bold text-sm sm:text-base truncate
                        {index === 0
                            ? 'text-[var(--ntnui-red)]'
                            : 'text-[var(--color-text)]'}"
                    >
                        {player.name}
                    </div>
                </div>
            </div>

            <!-- Fine Total -->
            <div class="shrink-0 self-center text-center min-w-[70px]">
                <div class="font-black text-sm sm:text-base text-[var(--color-text)]">
                    {player.fines_total} kr
                </div>
                <div class="text-[11px] font-normal text-[var(--color-text-muted)]">
                    total fines
                </div>
            </div>
        </div>
    {/each}
</div>