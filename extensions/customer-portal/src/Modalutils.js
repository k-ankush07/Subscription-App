/**
 * Small wrapper around the native <s-modal> show/hide behavior.
 *
 * The extension normally opens/closes modals declaratively via
 * `command="--show" commandfor="modal-id"` on a button/link, which the
 * runtime wires up for you. But some flows (e.g. clicking "Reschedule"
 * inside the "Upcoming orders" modal, which needs to close ITSELF and
 * open a DIFFERENT modal in response to a plain onClick, not a
 * declarative command) need to trigger that same behavior imperatively
 * from JS. These helpers do that by dispatching the same commands the
 * declarative attributes would.
 */

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

    // Fallback for runtimes where <s-modal> doesn't expose an imperative
    // .show() method — dispatch the same command the declarative
    // `command="--show"` attribute would trigger.
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