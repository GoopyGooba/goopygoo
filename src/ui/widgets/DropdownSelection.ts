import {AbstractDropdownSelection} from "./AbstractDropdownSelection";
import Widget from "./Widget";

/* TODO:
    - Styling pass over dropdown
    - Add arrow indicating that it's a dropdown
 */
export class DropdownSelection<T extends object | string | number> extends AbstractDropdownSelection<T> {
    constructor(options: AbstractDropdownSelection.options<T>, private items: T[]) {
        super(options, options.can_be_null ? (options.null_value || null) : items[0]);

        this.setDropdownItems(items)
    }

    protected constructInput(): Widget {
        return c("<div class='nisl-selectdropdown-input' tabindex='-1'>")
            .tapRaw((r) => r
                .on("click", (e) => {
                    if (this.dropdown) this.hideDropdown()
                    else this.openDropdown()
                })
            );
    }
}