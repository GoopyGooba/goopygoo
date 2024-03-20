import Properties from "../../widgets/Properties";
import {CacheTypes} from "./CacheTypes";
import LocInstance = CacheTypes.LocInstance;
import {LocParsingTable} from "./ParsingTable";
import {CursorType} from "../../../../lib/runescape/CursorType";
import {C} from "../../../../lib/ui/constructors";
import staticentity = C.staticentity;
import vbox = C.vbox;
import {LocUtil} from "./util/LocUtil";
import getActions = LocUtil.getActions;
import inlineimg = C.inlineimg;
import hboxl = C.hboxl;

export class LocInstanceProperties extends Properties {

    constructor(private instance: LocInstance, private parsing_table: LocParsingTable) {
        super();


        this.header(c().append(staticentity(this.instance.prototype.name), ` (${this.instance.loc_id})`))
        this.named("Usages", c().text(this.instance.loc_with_usages.uses.length))
        this.named("Actions", vbox(...getActions(this.instance.prototype).map(a => {
            return hboxl(inlineimg(CursorType.meta(a.cursor).icon_url).css("margin-right", "5px"), a.name)
        })))
        this.named("Size", `${this.instance.prototype.width ?? 1} x ${this.instance.prototype.length ?? 1}`)
        this.named("Rotation", (this.instance.rotation ?? 0).toString())
        this.named("Origin", `${instance.origin.x} | ${instance.origin.y} | ${instance.origin.level}`)

        if (parsing_table) {
            const parser = this.parsing_table.getPairing(this.instance)

            this.header("Parser")

            this.named("Group", parser?.group?.name ?? "-")
            this.named("IGroup", parser?.instance_group?.name ?? "-")
        }

    }
}