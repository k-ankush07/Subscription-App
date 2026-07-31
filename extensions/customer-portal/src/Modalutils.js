
export function showModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) {
        console.warn(`showModalById: no element found with id "${id}"`);
        return;
    }

    if (typeof modal.show === "function") {
        modal.show();
        return;
    }

    modal.dispatchEvent(
        new CustomEvent("command", { detail: { command: "--show" }, bubbles: true })
    );
}

export function hideModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) {
        console.warn(`hideModalById: no element found with id "${id}"`);
        return;
    }

    if (typeof modal.hide === "function") {
        modal.hide();
        return;
    }

    modal.dispatchEvent(
        new CustomEvent("command", { detail: { command: "--hide" }, bubbles: true })
    );
}