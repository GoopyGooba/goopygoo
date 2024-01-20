import * as leaflet from "leaflet"
import {Vector2} from "../../math";
import {Teleports} from "../../runescape/teleports";
import {GameEntity} from "../GameEntity";
import {C} from "../../ui/constructors";
import {OpacityGroup} from "../layers/OpacityLayer";
import div = C.div;
import img = C.img;

class TeleportEntity extends GameEntity {

    constructor(public teleport: Teleports.flat_teleport) {
        super();
        this.render()
    }

    protected render_implementation() {
        let highlighted = this.highlighted.value()

        c().text(this.teleport.hover)

        leaflet.marker(Vector2.toLatLong(this.teleport.spot), {
            icon: new TeleportIcon(this.teleport, highlighted ? "ctr-map-teleport-icon-highlighted" : null),
            riseOnHover: true
        }).addTo(this)
    }
}

class TeleportIcon extends leaflet.DivIcon {
    constructor(tele: Teleports.flat_teleport, cls: string = undefined) {
        let i = img(`./assets/icons/teleports/${typeof tele.icon == "string" ? tele.icon : tele.icon.url}`)

        if (typeof tele.icon != "string") {
            i.css2({
                "width": tele.icon.width ? tele.icon.width + "px" : "auto",
                "height": tele.icon.height ? tele.icon.height + "px" : "auto",
            })
        }

        super({
            iconSize: [0, 0],
            iconAnchor: [0, 0],
            html: div(
                i,
                tele.code ? c().text(tele.code) : undefined
            ).addClass("ctr-map-teleport-icon").addClass(cls).raw()
        });
    }
}

export class TeleportLayer extends OpacityGroup {

    constructor(public teleports: Teleports.flat_teleport[]) {
        super()

        for (let tele of teleports) {
            new TeleportEntity(tele).setHighlightable(true).addTo(this)
        }
    }
}