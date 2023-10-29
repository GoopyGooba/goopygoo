import {SidePanel} from "../SidePanelControl";
import {Modal} from "../widgets/modal";
import {ClueStep} from "../../../lib/runescape/clues";
import SmallImageButton from "../widgets/SmallImageButton";

export default abstract class MethodPanel extends SidePanel {
    protected constructor(options: {
        explanation_modal?: Modal,
        edit_handler?: () => void
    } = {}) {
        super();

        if (options.edit_handler) {
            this.ui.header.right_corner
                .append(SmallImageButton.new("assets/icons/edit.png").on("click", () => options.edit_handler()))
        }

        if (options.explanation_modal) {
            c("<span class='img-button'><img class='inline-img' src='assets/icons/info.png'></span>")
                .tapRaw(e => e.on("click", () => options.explanation_modal.show()))
                .appendTo(this.ui.header.right_corner)
        }
    }
}