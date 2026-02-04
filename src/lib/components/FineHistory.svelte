<script lang="ts">
  import { onMount } from "svelte";
  import { collection, getDocs } from "firebase/firestore/lite";

  let { database } = $props();

  let history: { date: Date; explanation: string }[] = $state([]);
  
  let currentPage: number = $state(1);
  const itemsPerPage: number = 5;

  const totalPages = $derived(() => Math.ceil(history.length / itemsPerPage));

  const pagedHistory = $derived(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return history.slice(start, end);
  });

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  function nextPage() {
    if (currentPage < totalPages()) currentPage++;
  }

  async function getFines() {
    const db_collection = collection(database, "prikk_melding");
    const db_snapshot = await getDocs(db_collection);
    const fine_list: { date: Date; explanation: string }[] = db_snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        date: data.date?.toDate ? data.date.toDate() : data.date ? new Date(data.date) : null,
        explanation: data.explanation ?? data.forklaring
      }
    });

    fine_list.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    });

    console.log("Retrieved fines from db")
    return fine_list;
  }

  function formatDate(date?: Date | null): string {
      if (!date || isNaN(date.getTime())) {
        return "Dato utilgjengelig";
      }
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }

  onMount(async () => {
    history = await getFines();
  });
</script>

{#each pagedHistory() as entry}
  <li>
    <strong>{formatDate(entry.date)}</strong> – {entry.explanation}
  </li>
{/each}


<div style="text-align:center; margin-top:1rem;">
  <button onclick={prevPage} disabled={currentPage === 1}>←</button>
  <span style="margin:0 1rem;">{currentPage} / {totalPages()}</span>
  <button onclick={nextPage} disabled={currentPage === totalPages()}>→</button>
</div>

<style>
  li {
    text-align: center;
    margin-top: 2rem;
  }
</style>