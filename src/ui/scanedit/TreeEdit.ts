import Widget from "../widgets/Widget";
import ScanEditPanel from "./ScanEditPanel";
import {ScanTree} from "../../model/scans/ScanTree";
import tree_node = ScanTree.decision_tree;
import augmented_tree = ScanTree.augmented_decision_tree;
import ScanDecision = ScanTree.ScanInformation;
import {Pulse} from "../../model/scans/scans";
import {util} from "../../util/util";
import Properties from "../widgets/Properties";
import natural_join = util.natural_join;
import TemplateStringEdit from "../widgets/TemplateStringEdit";
import {scantrainer} from "../../application";
import PathProperty from "../pathedit/PathProperty";
import shorten_integer_list = util.shorten_integer_list;
import Order = util.Order;
import {PathingGraphics} from "../map/path_graphics";
import {OpacityGroup} from "../map/layers/OpacityLayer";
import Checkbox from "../widgets/inputs/Checkbox";
import TextField from "../widgets/inputs/TextField";
import SmallImageButton from "../widgets/SmallImageButton";
import AbstractEditWidget from "../widgets/AbstractEditWidget";
import ScanRegion = ScanTree.ScanRegion;
import {SpotPolygon} from "../map/layers/ScanLayer";

class RegionEdit extends AbstractEditWidget<ScanRegion | null> {
    constructor() {
        super($("<div style='display: flex'></div>"));

        this.render()
    }

    private render() {
        this.empty()

        let is_defined = !!this.value

        new Checkbox().setValue(is_defined)
            .on("changed", (v) => {
                if (v) {
                    this.changed({
                        name: "",
                        area: {topleft: {x: 0, y: 0}, botright: {x: 0, y: 0}, level: 0}
                    })
                } else this.changed(null)

                this.render()
            })
            .appendTo(this)

        if (is_defined) {
            new TextField()
                .setValue(this.value.name)
                .css("flex-grow", "1")
                .appendTo(this)

            SmallImageButton.new("assets/icons/edit.png")
                .css("margin-left", "2px")
                .on("click", async () => {
                })
                .appendTo(this)

            SmallImageButton.new("assets/icons/regenerate.png")
                .css("margin-left", "2px")
                .on("click", async () => {
                })
                .appendTo(this)
        }
    }

    override update() {
        this.render()
    }
}

function render_completeness(completeness: ScanTree.completeness_t): Widget {
    return c("<span>").text("\u2713")
}

class TreeNodeEdit extends Widget<{
    "changed": ScanTree.decision_tree
}> {
    constructor(private parent: TreeEdit, private node: augmented_tree, include_paths: boolean) {
        super()

        let decision_path_text = "/" + node.information.map(d => ScanDecision.toString(d)).join("/")
        let spot_text = natural_join(shorten_integer_list(node.remaining_candidates.map((c) => ScanTree.spotNumber(parent.parent.value, c)),
            (n) => `<span class="ctr-digspot-inline">${n}</span>`
        ), "and")

        let header = c(`<div style="overflow: hidden; text-overflow: ellipsis; text-wrap: none; white-space: nowrap; font-weight: bold; font-size: 1.2em"></div>`).appendTo(this)
            .append(c(`<span class='nisl-textlink'>${decision_path_text}: </span>`).tooltip("Load decisions into map")
                .tapRaw(r => r.on("click", () => parent.emit("decisions_loaded", node.information)))
            )
            .append(c(`<span>${spot_text}</span>`))
            .append(render_completeness(node.completeness))


        /*
        type T = {
            remove?: boolean,
            create_new?: boolean,
            create_new_from_path?: boolean,
            area?: ScanSpot
        }

        let options: T[] = parent.parent.value.areas
            .filter(a => a.name.length > 0)
            .map(a => {
                return {area: a}
            })

        options.push({create_new: true})

        options.push({create_new_from_path: true})

        if (node.raw?.scan_spot_id != null) options.push({remove: true})
        else options.push({area: null})*/

        let props = new Properties().appendTo(this)

        //let path_row = c("<div style='display: flex'></div>")

        let prop = new PathProperty(parent.parent.layer.getMap(), {
            target: this.node.path.target,
            start_state: this.node.path.pre_state
        })
            .on("changed", v => {
                this.node.raw.path = v
                this.emit("changed", node.raw)
            })
            .on("loaded_to_editor", () => {
                this.parent.addToPathEditCounter(1)
            })
            .on("editor_closed", () => {
                this.parent.addToPathEditCounter(-1)
            })
            .setValue(this.node.raw.path)


        props.named("Path", prop)

        if (node.remaining_candidates.length > 1 && (!node.parent || node.parent.key.pulse != 3)) {
            props.named("Region", new RegionEdit().setValue(this.node.raw.region))
        }

        props.named("Direction",
            new TemplateStringEdit({
                resolver: scantrainer.template_resolver.with(ScanTree.template_resolvers(node)),
                generator: () => {
                    let path_short =
                        this.node.path.steps.length > 0
                            ? this.node.raw.path.map(PathingGraphics.templateString).join(" - ")
                            : "Go"

                    let target = "{{target}}"

                    return path_short + " to " + target
                }
            })
                .on("changed", (v) => {
                    this.node.raw.directions = v
                    //this.changed(this.value) // TODO:
                })
                .setValue(this.node.raw.directions)
        )
    }

    region_preview: SpotPolygon = null

    updatePreview(layer: OpacityGroup) {
        if (this.node.raw.region) {
            this.region_preview = new SpotPolygon(this.node.raw.region).addTo(layer)
        }

        return PathingGraphics.renderPath(this.node.raw.path).addTo(layer)
    }
}

export default class TreeEdit extends Widget<{
    changed: tree_node,
    decisions_loaded: ScanDecision[],
    preview_invalidated: null,
    path_editor_state_changed: boolean,
}> {
    private hide_paths = false

    render_promise: Promise<void> = null

    constructor(public parent: ScanEditPanel, public value: tree_node) {
        super($("<div class='nisl-alternating'>"))

        this.update()
    }

    async update() {
        this.empty()

        this.render_promise = this.renderContent()

        return this.render_promise
    }

    children: TreeNodeEdit[] = []

    private async renderContent() {
        let augmented = await ScanTree.augment(this.parent.value, {analyze_completeness: true})

        let self = this

        /*new Properties().appendTo(this)
            .named("Hide Paths?", new Checkbox().setValue(self.hide_paths).on("changed", (v) => {
                self.hide_paths = v
                self.update()
                this.emit("preview_invalidated", null)
            }))*/

        this.children = []

        function helper(node: augmented_tree) {
            // Only create edits for real nodes
            if (node.raw) self.children.push(new TreeNodeEdit(self, node, !self.hide_paths)
                .on("changed", async () => {
                    await ScanTree.normalize(self.parent.value)
                    await self.update()
                    await self.emit("preview_invalidated", null)
                })
                .appendTo(self))

            node.children
                .filter(n => n.key)
                .sort(Order.comap(Order.reverse(Pulse.compare), a => a.key))
                .forEach(c => helper(c.value))
            return null
        }

        helper(augmented)
    }

    setValue(value: tree_node) {
        this.value = value
        this.update()
    }

    _pathEditCounter = 0

    addToPathEditCounter(n: number) {
        let before = this._pathEditCounter > 0

        this._pathEditCounter += n

        let now = this._pathEditCounter > 0

        if (before != now) this.emit("path_editor_state_changed", now)
    }

    async updatePreview(layer: OpacityGroup) {
        await this.render_promise

        if (!this.hide_paths) this.children.forEach(c => c.updatePreview(layer))
    }
}
