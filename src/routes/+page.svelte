<script lang="ts">
  import DialogBox from "$lib/components/DialogBox.svelte";
  import FineHistory from "$lib/components/FineHistory.svelte";
  import InputBox from "$lib/components/InputBox.svelte";
  import Leaderboard from "$lib/components/Leaderboard.svelte";
  import { database } from "$lib/utils/firestore";
  import { onMount } from "svelte";
  import { type Firestore, collection, getDocs, query, orderBy } from "firebase/firestore/lite";

  type Rule = {
    description: string;
    fine: number;
  };
  let regler: Array<Rule> = $state([]);

  let showDialog: boolean = $state(false);
  function toggleShowDialog() {
    showDialog = !showDialog;
  };

  let leaderboard: boolean = $state(true);
  function toggleLeaderboard(value: boolean){
    leaderboard = value;
  }

  async function getRules(db: Firestore) {
    const reglerCol = collection(db, "fine_rules");

    const reglerQuery = query(reglerCol, orderBy("sort_order", "asc"));

    const reglerSnapshot = await getDocs(reglerQuery);

    const reglerList: Array<Rule> = reglerSnapshot.docs.map((doc) => {
      let data = doc.data();
      return {
        description: data.rule,
        fine: data.fine,
      };
    });
    console.log("Retrieved rules from db")
    return reglerList;
  }

  onMount(async () => {
    regler = await getRules(database);
  });
</script>

<div class="topper">
  <p class="h3c">H3C</p>
  <h1>Botsystem</h1>
  <button onclick={toggleShowDialog} class="open-rules">?</button>
</div>

<hr>

<img src="img/cover.png" alt="cool stuff" />

<h2>Legg inn ny bot <span class="plus">+</span></h2>


<InputBox {database} />

<div class="menu">
  <div class="element" class:active={leaderboard} onclick={() => toggleLeaderboard(true)}>
    <p class="menu_text">Leaderboard</p>
  </div>
  <div class="element" class:active={!leaderboard} onclick={() => toggleLeaderboard(false)}>
    <p class="menu_text">Siste bøter</p>
  </div>
  <div
    class="active-indicator"
    style="transform: translateX({leaderboard ? '0%' : '110px'})"
  />
</div>

{#if leaderboard}
<Leaderboard {database}/>
{:else}
<FineHistory {database} />
{/if}

<!-- Keep at end to have as overlay -->
{#if showDialog}
  <DialogBox {toggleShowDialog} {regler} />
{/if}

<style>
  .active-indicator {
    position: absolute;
    top: 5px;
    left: 5px;
    width: 100px;

    height: 40px;
    background: #006A3A;
    border-radius: 8px;
    z-index: -1;

    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }


  .menu {
    position: relative;
    display: flex;
    flex-direction: row;

    width: 220px;
    height: 50px;
    border-radius: 14px;
    gap: 10px;
    border: solid;
    border-width: 0.5px;
    margin-right: auto;
    margin-left: auto;
    margin-top: 50px;  
  }

  .element {
    flex: 1;
  }

  .menu_text {
    text-align: center;
    transition: color 0.25s ease;
  }

  .element.active .menu_text {
  color: white;
}

  .topper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 7px;
  }

  .h3c {
    font-weight: 400;
    font-size: 16px;
  }

  h1 {
    color: #006A3A;
    font-size: 21px;
    font-weight: 700;
    font-style: bold;
  }

  h2 { 
    font-size: 23px;
    font-weight: 700;
    font-style: bold;
    color: #414141;
  }

  .plus {
    font-size: 35px;
    font-weight: 100;
    font-style: italic;
  }

  .open-rules {
    border-radius: 50%;
    height: 1.5rem;
    width: 1.5rem;
    background-color: transparent;
    font-size: 16px;
  }

  .open-rules:hover {
    background-color: rgb(241, 241, 241);
  }

  hr {
    opacity: .5;
  }

  img {
    width: 70vw;
    border-radius: 5px;
    display: block;
    margin: auto;
  }
</style>
