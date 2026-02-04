<script lang="ts">
    import { onMount } from "svelte";
    import { collection, getDocs } from "firebase/firestore/lite";

    let { database } = $props();

    let leaderboard: {name: string, fines_total: number}[] = $state([]);

    async function getLeaderboard() {
        const db_collection = collection(database, "prikk_approved");
        const db_snapshot = await getDocs(db_collection);

        const player_list = db_snapshot.docs.map((doc) => {
            const data = doc.data();

            const finesArray = Array.isArray(data.fines_nok) ? data.fines_nok : [];

            return {
                name: data.name || "Unknown",
                fines_total: finesArray.reduce((sum: number, fine: number) => sum + (Number(fine) || 0), 0),
            };
        });

        player_list.sort((a, b) => b.fines_total - a.fines_total);

        return player_list;
    }

    onMount(async () => {
        leaderboard = await getLeaderboard();
    });
</script>

<ol>
    {#each leaderboard as player}
            <li>{player.name}: {player.fines_total}kr</li>
    {/each}
</ol>

<style>

    ol {
        border-radius: 10px;
        font-size: 20px;
        font-weight: 400;
        margin-left: 50px;
    }

    li {
        margin-bottom: 10px;
    }


    ol li:last-child {
        margin-bottom: 0;

    }

</style>