<script lang="ts">
  import { addDoc, collection } from "firebase/firestore/lite";

  let { database } = $props();

  let player: string = $state("");
  let comment: string = $state("");

  let error: boolean = $state(false)

  // TODO: this should be a util function or something, same goes for the reads in other components.
  async function handleWriteFine() {
    if (player === "" || comment === ""){
      error = true;
      return;
    }

    try {
      await addDoc(collection(database, "prikk_melding"), {
        explanation: player + ": " + comment,
        date: new Date()
      });
    } catch (err) {
      console.warn("Firestore not connected or error writing fine:", err);
    }

    player = "";
    comment = "";
    error = false;
  }
</script>

<div class="add_fine">
  <div class="component">
    <label for="player">Spiller <span class="asterisk">*</span></label>
    <input id="player" type="text" bind:value={player}>
  </div>
  <div class="component">
    <label for="comment">Kommentar <span class="asterisk">*</span></label>
    <input id="comment" type="text" bind:value={comment}>
  </div>
  <button onclick={handleWriteFine}>Send inn</button>
</div>
{#if error}
  <p>
    Mangler felt
  </p>
{/if}

<style>
  button {
    background-color: #006A3A;
    height: 43px;
    border-radius: 8px;
    padding: 10px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    font-style: semi-bold;
    color: #FFFFFF;
  }

  p {
    color: #FF4D4DD6;
    bottom: 0;
  }

  .add_fine{
    display: flex;
    flex-direction: column;
    gap: 34px;
    font-size: 14px;
    font-style: medium;
    font-weight: 500;
  }

  .component {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
  }

  input {
    border-radius: 8px;
    border-width: 1px;
    padding: 14px;
  }
  
  .asterisk {
    color: #FF4D4DD6;
  }
</style>
