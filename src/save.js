/*
==================================================
SAVE / LOAD (localStorage)
==================================================

Everything that matters is plain data: genomes
(incl. mutation colors + parents), care values,
coins, day clock and the regular NPC identities.

save() is debounced - call markDirty() freely.
==================================================
*/

const KEY = "fluffpark-save-v1";

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return null;
    }

    const data = JSON.parse(raw);

    if (data.version !== 1) {
      return null;
    }

    return data;
  } catch (error) {
    console.warn("FluffPark: could not load save", error);
    return null;
  }
}

export function saveGame(data) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, ...data })
    );
  } catch (error) {
    console.warn("FluffPark: could not save", error);
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

/* debounced saver */
export function makeSaver(collect) {
  let timer = null;

  function flush() {
    timer = null;
    saveGame(collect());
  }

  return {
    markDirty() {
      if (!timer) {
        timer = setTimeout(flush, 1200);
      }
    },

    flush() {
      if (timer) {
        clearTimeout(timer);
      }

      flush();
    }
  };
}
