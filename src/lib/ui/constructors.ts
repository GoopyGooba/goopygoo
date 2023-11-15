import Widget from "./Widget";

export namespace C {


    export function create(s: string): Widget {
        return c(s)
    }

    export function hbox(...content: Widget[]): Widget {
        return create("<div style='display: flex'></div>").append(...content)
    }

    export function hboxc(...content: Widget[]): Widget {
        return create("<div style='display: flex; justify-content: center'></div>").append(...content)
    }

    export function vbox(...content: Widget[]): Widget {
        return create("<div></div>").append(...content)
    }

    export function centered(...content: Widget[]): Widget {
        return create("<div style='text-align: center'></div>").append(...content)
    }

    export function spacer(): Widget {
        return create("<div style='flex-grow: 1'></div>")
    }

    export function span(text: string): Widget {
        return create("<span></span>").setInnerHtml(text)
    }

}