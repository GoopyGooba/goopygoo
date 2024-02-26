import * as leaflet from "leaflet";
import Widget from "lib/ui/Widget";
import TemplateStringEdit from "../widgets/TemplateStringEdit";
import Properties from "../widgets/Properties";
import LightButton from "../widgets/LightButton";
import {Path} from "lib/runescape/pathing";
import MovementStateView from "./MovementStateView";
import {SmallImageButton} from "../widgets/SmallImageButton";
import {util} from "lib/util/util";
import {TileRectangle} from "lib/runescape/coordinates/TileRectangle";
import movement_state = Path.movement_state;
import issue = Path.issue;
import Behaviour from "lib/ui/Behaviour";
import {Transportation} from "../../../lib/runescape/transportation";
import {Rectangle, Vector2} from "lib/math";
import TemplateResolver from "lib/util/TemplateResolver";
import {GameMapContextMenuEvent} from "lib/gamemap/MapEvents";
import GameLayer from "lib/gamemap/GameLayer";
import {DrawAbilityInteraction} from "./interactions/DrawAbilityInteraction";
import PathEditActionBar from "./PathEditActionBar";
import InteractionLayer, {InteractionGuard} from "lib/gamemap/interaction/InteractionLayer";
import {GameMapControl} from "lib/gamemap/GameMapControl";
import {ShortcutViewLayer} from "../shortcut_editing/ShortcutView";
import {Observable, ObservableArray, observe} from "../../../lib/reactive";
import {floor_t, TileCoordinates} from "../../../lib/runescape/coordinates";
import {C} from "../../../lib/ui/constructors";
import hbox = C.hbox;
import span = C.span;
import spacer = C.spacer;
import sibut = SmallImageButton.sibut;
import * as assert from "assert";
import vbox = C.vbox;
import * as lodash from "lodash";
import {MenuEntry} from "../widgets/ContextMenu";
import MapCoordinateEdit from "../widgets/MapCoordinateEdit";
import PlaceRedClickInteraction from "./interactions/PlaceRedClickInteraction";
import InteractionSelect from "./InteractionSelect";
import SelectTileInteraction from "../../../lib/gamemap/interaction/SelectTileInteraction";
import InteractionTopControl from "../map/InteractionTopControl";
import DirectionSelect from "./DirectionSelect";
import DrawRunInteraction from "./interactions/DrawRunInteraction";
import {PathFinder} from "../../../lib/runescape/movement";
import index = util.index;
import {ShortcutEdit} from "../shortcut_editing/ShortcutEdit";
import {Checkbox} from "../../../lib/ui/controls/Checkbox";
import {PathStepEntity} from "../map/entities/PathStepEntity";
import TransportLayer from "../map/TransportLayer";
import {TileArea} from "../../../lib/runescape/coordinates/TileArea";
import {CursorType} from "../../../lib/runescape/CursorType";
import {boxPolygon} from "../polygon_helpers";
import default_interactive_area = Transportation.EntityTransportation.default_interactive_area;
import EntityTransportation = Transportation.EntityTransportation;
import {TransportData} from "../../../data/transports";
import resolveTeleport = TransportData.resolveTeleport;
import {TeleportSpotEntity} from "../map/entities/TeleportSpotEntity";
import {EntityTransportEntity} from "../map/entities/EntityTransportEntity";
import {arrow} from "../path_graphics";
import TextField from "../../../lib/ui/controls/TextField";
import {NislIcon} from "../nisl";
import {EntityNameEdit} from "../widgets/EntityNameEdit";

export class IssueWidget extends Widget {
    constructor(issue: issue) {
        super($(`<div class='ctr-step-issue'><div class="ctr-step-issue-icon"></div> ${issue.message}</div>`).attr("level", issue.level.toString()));
    }
}

function needRepairing(state: movement_state, shortcut: Path.step_transportation): boolean {
    return state.position.tile
        && TileArea.contains(shortcut.internal.actions[0].interactive_area || default_interactive_area(shortcut.internal.clickable_area), state.position.tile)
        && !TileCoordinates.eq2(state.position.tile, shortcut.assumed_start)
}

function repairShortcutStep(state: movement_state, shortcut: Path.step_transportation): void {
    shortcut.assumed_start = state.position.tile
}

class StepEditWidget extends Widget {

    private shortcut_custom_open: boolean = false

    constructor(private parent: ControlWidget, public value: PathEditor.OValue) {
        super()

        this.addClass("step-edit-component")

        value.value().augmented.subscribe(v => {
            if (!v) debugger
            this.render(v)
        }, true)
    }

    private render(value: Path.augmented_step) {
        this.empty()

        if (!value) return

        // Render header
        {
            let bounds = Path.augmented.step_bounds(value)

            hbox(
                hbox(
                    span(`T${value.pre_state.tick}`).addClass('nisl-textlink')
                        .addTippy(new MovementStateView(value.pre_state)),
                    c("<span>&nbsp;-&nbsp;</span>"),
                    c("<span class='nisl-textlink'></span>").text(`T${value.post_state.tick}`)
                        .addTippy(new MovementStateView(value.post_state)),
                    c(`<span>: ${Path.title(value.raw)}</span>`)
                ).css("font-weight", "bold"),
                spacer(),
                sibut("assets/nis/arrow_up.png", () => this.value.move(-1))
                    .tooltip("Move step up").setEnabled(this.value.index.value() != 0),
                sibut("assets/nis/arrow_down.png", () => this.value.move(1))
                    .tooltip("Move step down").setEnabled(this.value.index.value() != this.parent.editor.value.get().length - 1),
                sibut("assets/icons/delete.png", () => this.value.remove()),
                sibut("assets/icons/fullscreen.png", () => {
                    this.parent.editor.game_layer.getMap().fitView(bounds, {maxZoom: 5}
                    )
                }).setEnabled(!!bounds)
            ).addClass("path-step-edit-widget-control-row").appendTo(this)
        }

        let issues = c().addClass("step-edit-issues").appendTo(this)

        value.issues.forEach(i => new IssueWidget(i).appendTo(issues))

        let props = new Properties().css2({
            "padding": "3px"
        }).appendTo(this)

        props.named("Detail",
            new TemplateStringEdit({
                resolver: this.parent.editor.template_resolver,
                generator: null
            })
                .setValue(value.raw.description)
                .onCommit(v => this.value.update(o => o.raw.description = v))
        )

        switch (value.raw.type) {
            case "ability":
                props.named("Action",
                    hbox(
                        span(`${TileCoordinates.toString(value.raw.from)} to ${TileCoordinates.toString(value.raw.to)}`),
                        spacer(),
                        new LightButton("Redraw")
                            .onClick(() => this.parent.editor.redrawAbility(this.value))
                    )
                )

                if (value.raw.ability == "dive" || value.raw.ability == "barge") {
                    props.named(span("Target").css("cursor", "help").tooltip("The entity to target with this ability."), new EntityNameEdit(false)
                        .setValue(value.raw.target)
                        .onCommit(name => {
                            this.value.update(v => {
                                assert(v.raw.type == "ability")

                                v.raw.target = name
                            })
                        })
                    )
                }

                props.named(span("Text").css("cursor", "help").tooltip("(Optional) Strings like 'on top of the flower'."),
                    new TextField()
                        .setValue(value.raw.target_text || "")
                        .onCommit(text => this.value.update(v => {
                            assert(v.raw.type == "ability")

                            v.raw.target_text = text || undefined
                        }))
                )

                break;
            case "cheat":
                props.named("Target",
                    hbox(
                        span(`${TileCoordinates.toString(value.raw.target)}`),
                        spacer(),
                        new LightButton("Move")
                            .onClick(() => {
                                assert(value.raw.type == "cheat")

                                this.parent.editor.interaction_guard.set(
                                    new SelectTileInteraction({
                                        preview_render: (target) => {
                                            assert(value.raw.type == "cheat")

                                            return arrow(value.raw.assumed_start, value.raw.target)
                                                .setStyle({
                                                    color: "#069334",
                                                    weight: 4,
                                                    dashArray: '10, 10',
                                                })
                                        }
                                    })
                                        .onCommit(new_s => this.value.update(v => {
                                            assert(v.raw.type == "cheat")
                                            v.raw.target = new_s
                                        }))
                                        .onStart(() => this.value.value().associated_preview?.setOpacity(0))
                                        .onEnd(() => this.value.value().associated_preview?.setOpacity(1))
                                    ,
                                )
                            })
                    )
                )

                break
            case "redclick":

                props.named("Where",
                    hbox(
                        span(`${Vector2.toString(value.raw.where)}`),
                        spacer(),
                        new LightButton("Move").onClick(() => this.parent.editor.moveStep(this.value))
                    )
                )

                props.named("Action", new InteractionSelect()
                    .setValue(value.raw.how)
                    .onSelection(how => {
                        this.value.update(v => {
                            assert(v.raw.type == "redclick")
                            v.raw.how = how
                        })
                    })
                )

                props.named(span("Target").css("cursor", "help").tooltip("The name of the entity to target."), new EntityNameEdit(false)
                    .setValue(value.raw.target)
                    .onCommit(name => {
                        this.value.update(v => {
                            assert(v.raw.type == "ability")

                            v.raw.target = name
                        })
                    })
                )

                break
            case "powerburst":
                props.named("Where",
                    hbox(
                        span(`${Vector2.toString(value.raw.where)}`),
                        spacer(),
                        new LightButton("Move").onClick(() => this.parent.editor.moveStep(this.value))
                    )
                )

                break

            case "run":
                props.named("Path",
                    hbox(
                        span(`${PathFinder.pathLength(value.raw.waypoints)} tile path to ${Vector2.toString(index(value.raw.waypoints, -1))}`),
                        spacer(),
                        new LightButton("Edit")
                            .onClick(() => this.parent.editor.redrawAbility(this.value))
                    )
                )

                props.named(span("Text").tooltip("(Optional) Strings like 'on top of the flower'."),
                    new TextField()
                        .setValue(value.raw.to_text || "")
                        .onCommit(text => this.value.update(v => {
                            assert(v.raw.type == "run")

                            v.raw.to_text = text || undefined
                        }))
                )

                break

            case "transport": {
                let body: ShortcutEdit = ShortcutEdit.forSimple(value.raw.internal, this.parent.editor.interaction_guard,
                    v => {
                        this.parent.editor.game_layer.getMap().fitBounds(util.convert_bounds(Rectangle.toBounds(Transportation.bounds(v))), {maxZoom: 5})
                    })

                if (!this.shortcut_custom_open) body.css("display", "none")
                else body.config.associated_preview = new ShortcutViewLayer.ShortcutPolygon(body.config.value).addTo(this.value.value().associated_preview)

                this.append(body)
            }
                break;
            case "orientation":
                props.named("Facing", new DirectionSelect()
                    .setValue(value.raw.direction)
                    .onSelection(dir => {
                        this.value.update(v => {
                            assert(v.raw.type == "orientation")
                            v.raw.direction = dir
                        })
                    })
                )

                break;
            case "teleport":
                props.named(span("Spot").css("cursor", "help").tooltip("The specific target tile."),
                    hbox(
                        span(`${TileCoordinates.toString(value.raw.spot)}`),
                        spacer(),
                        new LightButton("Move").onClick(() => this.parent.editor.moveStep(this.value))
                    )
                )

                break
        }

        // TODO: Fix scroll events passing through
    }
}

class ControlWidget extends GameMapControl {
    steps_container: Widget
    step_widgets: StepEditWidget[] = []

    issue_container: Widget

    constructor(public editor: PathEditor,
                private data: Observable<{ path: Path.augmented, steps: PathEditor.OValue[] }>
    ) {
        super({
            position: "left-top",
            type: "floating"
        }, c())

        this.content.addClass("path-edit-control")

        this.issue_container = vbox().appendTo(this.content)

        this.steps_container = vbox().appendTo(this.content).css2({
            "max-height": "800px",
            "overflow-y": "auto",
        })


        data.subscribe(({path, steps}) => this.render(path, steps))
    }

    private render(augmented: Path.augmented, steps: PathEditor.OValue[]) {
        {
            this.issue_container.empty()

            for (let issue of augmented.issues) {
                new IssueWidget(issue).appendTo(this.issue_container)
            }
        }

        let existing: { widget: StepEditWidget, keep: boolean }[] = this.step_widgets.map(w => ({widget: w, keep: false}))

        // Render edit widgets for indiviual steps
        this.step_widgets = steps.map(step => {
            let e = existing.find(e => e.widget.value == step)

            if (e) {
                e.keep = true
                return e.widget
            } else {
                return new StepEditWidget(this, step)
            }
        })

        existing.forEach(e => { if (e.keep) e.widget.detach() })

        this.steps_container.empty().append(...this.step_widgets)

        if (steps.length == 0) {
            c("<div style='text-align: center'></div>").appendTo(this.steps_container)
                .append(c("<span>No steps yet.</span>"))
                .append(c("<span class='nisl-textlink'>&nbsp;Hover to show state.</span>")
                    .addTippy(new MovementStateView(augmented.pre_state)))
        }

        return this
    }
}

class PathEditorGameLayer extends GameLayer {
    constructor(private editor: PathEditor) {
        super();

        new TransportLayer(true).addTo(this)
    }

    eventContextMenu(event: GameMapContextMenuEvent) {
        event.onPost(() => {
            if (this.editor.isActive()) {

                if (!event.active_entity) {
                    event.add({
                        type: "basic",
                        text: "Walk here",
                        icon: "assets/icons/yellowclick.png",
                        handler: () => {

                        }
                    })

                    event.add({
                        type: "submenu",
                        text: "Create Redclick",
                        icon: "assets/icons/redclick.png",
                        children: CursorType.all().map((i): MenuEntry => ({
                            type: "basic",
                            text: i.description,
                            icon: i.icon_url,
                            handler: () => {
                                this.editor.value.create({
                                    type: "redclick",
                                    target: CursorType.defaultEntity(i.type),
                                    where: event.tile(),
                                    how: i.type
                                })
                            }
                        }))
                    })
                } else if (event.active_entity instanceof TeleportSpotEntity) {
                    const t = event.active_entity.config.teleport

                    if (t.group.access.length == 1) {
                        const a = t.group.access[0]

                        event.addForEntity({
                            type: "basic",
                            text: c().append(`Use via `, TeleportSpotEntity.accessNameAsWidget(a)),
                            handler: () => {
                                this.editor.value.add({
                                    raw: {
                                        type: "teleport",
                                        spot: t.target(),
                                        id: {...t.id(), access: a.id},
                                    }
                                })
                            }
                        })
                    } else {
                        event.addForEntity({
                            type: "submenu",
                            text: `Use via`,
                            children: t.group.access.map(a => {
                                return {
                                    type: "basic",
                                    text: c().append(TeleportSpotEntity.accessNameAsWidget(a)),
                                    handler: () => {
                                        this.editor.value.add({
                                            raw: {
                                                type: "teleport",
                                                spot: t.target(),
                                                id: {...t.id(), access: a.id},
                                            }
                                        })
                                    }
                                }
                            })
                        })
                    }
                } else if (event.active_entity instanceof EntityTransportEntity) {

                    let s = Transportation.normalize(event.active_entity.config.shortcut)

                    s.actions.forEach(a => {
                        event.add({
                            type: "basic",
                            text: `${s.entity.name}: ${a.name}`,
                            icon: CursorType.meta(a.cursor).icon_url,
                            handler: async () => {
                                const t = this.editor.value.post_state.value()?.position?.tile

                                let assumed_start = t
                                const interactive_area = a.interactive_area || EntityTransportation.default_interactive_area(s.clickable_area)

                                if (t) {
                                    const path_to_start = await PathFinder.find(
                                        PathFinder.init_djikstra(t),
                                        interactive_area
                                    )

                                    if (path_to_start && path_to_start.length > 1) {
                                        if (assumed_start) assumed_start = index(path_to_start, -1)
                                        this.editor.value.create({
                                            type: "run",
                                            waypoints: path_to_start,
                                        })
                                    }
                                }

                                assumed_start ??=
                                    t ? TileRectangle.clampInto(t, TileArea.toRect(
                                            interactive_area,
                                        ))
                                        : interactive_area.origin

                                let clone = lodash.cloneDeep(s)
                                clone.actions = [lodash.cloneDeep(a)]

                                this.editor.value.create({
                                    type: "transport",
                                    assumed_start: assumed_start,
                                    internal: clone
                                })
                            }
                        })
                    })
                } else if (event.active_entity instanceof PathStepEntity) {
                    let i = this.editor.value.value().findIndex(v => v.value().associated_preview == event.active_entity)

                    if (i >= 0) {
                        let v = this.editor.value.value()[i]

                        event.addForEntity({
                            type: "basic",
                            text: `Remove`,
                            handler: () => this.editor.value.remove(v)
                        })

                        if (v.value().raw.type == "ability") {

                            event.addForEntity({
                                type: "basic",
                                text: `Redraw`,
                                handler: () => this.editor.redrawAbility(v)
                            })
                        }

                        if (v.value().raw.type == "powerburst" || v.value().raw.type == "redclick" || v.value().raw.type == "teleport") {

                            event.addForEntity({
                                type: "basic",
                                text: `Move`,
                                handler: () => this.editor.moveStep(v)
                            })
                        }

                    }
                }

            }
        })
    }

}

export class PathBuilder extends ObservableArray<PathEditor.Value> {
    create(step: Path.Step) {
        this.add({raw: step})
    }

    override add(v: PathEditor.Value): ObservableArray.ObservableArrayValue<PathEditor.Value> {
        if (!v.augmented) v.augmented = observe(null)

        if (!v) {
            console.log("PANIC, adding null to step list")
            debugger
        }

        return super.add(v);
    }

    override setTo(data: PathEditor.Value[]): this {
        data.forEach(v => {
            if (!v.augmented) v.augmented = observe(null)
        })

        if (data.some(s => !s)) {
            console.log("PANIC, adding null to step list")
            debugger
        }

        return super.setTo(data)
    }

    augmented_value: Observable<{ path: Path.augmented, steps: PathEditor.OValue[] }> = observe({path: null, steps: []})
    post_state: Observable<movement_state>


    augmenting_lock: Promise<void> = null

    private async updateAugment() {
        await this.augmenting_lock

        this.augmenting_lock = (async () => {
            let v = this._value

            let aug = await Path.augment(v.map(s => s.value().raw), this.meta.start_state, this.meta.target)

            for (let i = 0; i < aug.steps.length; i++) {
                if (!aug.steps[i]) debugger

                v[i].value().augmented?.set(aug.steps[i])
            }

            this.augmented_value.set({path: aug, steps: v})
        })()
    }

    constructor(private meta: {
        target?: TileRectangle,
        start_state?: movement_state,
        preview_layer?: GameLayer
    } = {}) {
        super();

        this.post_state = this.augmented_value.map(({path}) => path?.post_state)

        this.element_changed.on(() => this.updateAugment())
        this.array_changed.on(v => this.updateAugment())

        this.element_added.on(e => this.updatePreview(e))
        this.element_removed.on(e => e.value().associated_preview?.remove())
        this.element_changed.on(e => this.updatePreview(e))

        this.augmented_value.subscribe(v => {
            for (let i = 0; i < v.path.steps.length; i++) {
                let step = v.path.steps[i]

                if (step.raw.type == "transport" && needRepairing(step.pre_state, step.raw)) {

                    this._value[i].update(s => {
                        assert(s.raw.type == "transport")
                        repairShortcutStep(step.pre_state, s.raw)
                    })

                    return
                }
            }
        })
    }

    private updatePreview(o: PathEditor.OValue) {
        let value = o.value()

        if (value.associated_preview) {
            value.associated_preview.remove()
            value.associated_preview = null
        }

        if (this.meta.preview_layer) {
            value.associated_preview =
                new PathStepEntity({step: value.raw, highlightable: true, interactive: true})
                    .addTo(this.meta.preview_layer)
        }
    }

    public construct(): Path.raw {
        return lodash.cloneDeep(this.value().map(s => s.value().raw))
    }

    public load(p: Path.raw): void {
        this.setTo(p.map(s => ({raw: lodash.cloneDeep(s)})))
    }
}


export class PathEditor extends Behaviour {
    private control: ControlWidget = null
    private handler_layer: PathEditorGameLayer = null

    private you_are_here_marker: leaflet.Layer = null

    action_bar: PathEditActionBar

    interaction_guard: InteractionGuard

    value: PathEditor.Data

    constructor(public game_layer: GameLayer,
                public template_resolver: TemplateResolver,
                public options: PathEditor.options_t
    ) {
        super()

        // Set up handler layer, but don't add it anywhere yet.
        this.handler_layer = new PathEditorGameLayer(this)

        this.value = new PathBuilder({
            target: this.options.target,
            start_state: this.options.start_state,
            preview_layer: this.handler_layer
        })

        this.value.augmented_value.subscribe(({path}) => {
            if (this.action_bar) this.action_bar.state.set(path.post_state)
        })

        this.value.post_state.subscribe(state => {

            if (this.you_are_here_marker) {
                this.you_are_here_marker.remove()
                this.you_are_here_marker = null
            }

            if (state.position.tile) {
                this.you_are_here_marker = leaflet.marker(Vector2.toLatLong(state.position.tile), {
                    icon: leaflet.icon({
                        iconUrl: "assets/icons/youarehere.png",
                        iconSize: [25, 25],
                        iconAnchor: [13, 13],
                    })
                }).addTo(this.handler_layer)
            }
        })

        this.control = new ControlWidget(this, this.value.augmented_value).addTo(this.handler_layer)
        this.interaction_guard = new InteractionGuard().setDefaultLayer(this.handler_layer)
        this.action_bar = new PathEditActionBar(this, this.interaction_guard).addTo(this.handler_layer)

        this.value.load(options.initial)
    }

    protected begin() {
        this.handler_layer.addTo(this.game_layer)

        this.game_layer.getMap().container.focus()

        const bounds = Rectangle.combine(Path.bounds(this.options.initial), Rectangle.from(this.options.start_state?.position?.tile), this.options.target)

        if (this.options.target) {
            boxPolygon(this.options.target).addTo(this.handler_layer)
        }

        const level = this.options.target?.level ?? this.options.start_state?.position?.tile?.level ?? Math.min(...this.options.initial.map(Path.Step.level))

        if (bounds) this.game_layer.getMap().fitView(TileRectangle.lift(bounds, level as floor_t), {maxZoom: 3})
    }

    protected end() {
        this.handler_layer.remove()
    }

    discard() {
        if (this.options.discard_handler) this.options.discard_handler()
    }

    commit() {
        this.options.commit_handler(this.value.construct())
    }

    close() {
        this.discard()

        this.stop()
    }

    editStep(value: PathEditor.OValue, interaction: InteractionLayer) {
        this.interaction_guard.set(interaction
            .onStart(() => value.value().associated_preview?.setOpacity(0))
            .onEnd(() => value.value().associated_preview?.setOpacity(1))
        )
    }

    redrawAbility(value: PathEditor.OValue) {
        const v = value.value()

        if (v.raw.type == "ability") {
            this.editStep(value,
                new DrawAbilityInteraction(v.raw.ability)
                    .setStartPosition(v.raw.from)
                    .onCommit(new_s => value.update(v => v.raw = new_s))
            )
        } else if (v.raw.type == "run") {
            this.editStep(value,
                new DrawRunInteraction()
                    .setStartPosition(v.raw.waypoints[0])
                    .onCommit(new_s => value.update(v => v.raw = new_s)))
        }
    }

    moveStep(value: PathEditor.OValue) {
        const v = value.value()

        if (v.raw.type == "redclick") {
            this.editStep(
                value,
                new PlaceRedClickInteraction(v.raw.how)
                    .onCommit(new_s => value.update(v => {
                        assert(v.raw.type == "redclick")
                        v.raw.where = new_s.where
                    }))
            )
        } else if (v.raw.type == "powerburst") {
            this.editStep(value,
                new SelectTileInteraction({
                    preview_render: tile => new PathStepEntity({
                        step: {
                            type: "powerburst",
                            where: tile,
                        }
                    })
                })
                    .onCommit(new_s => value.update(v => {
                        assert(v.raw.type == "powerburst")
                        v.raw.where = new_s
                    }))
                    .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the location of the powerburst by clicking the tile.`))
            )
        } else if (v.raw.type == "teleport") {
            // TODO: Limit to possible tiles.

            this.editStep(value,
                new SelectTileInteraction({
                    preview_render: tile => {
                        assert(v.raw.type == "teleport")
                        return new PathStepEntity({
                            interactive: false,
                            step: {
                                type: "teleport",
                                id: v.raw.id,
                                spot: tile,
                            }
                        })
                    }
                })
                    .onCommit(new_s => value.update(v => {
                        assert(v.raw.type == "teleport")
                        v.raw.spot = new_s
                    }))
                    .attachTopControl(new InteractionTopControl().setName("Selecting tile").setText(`Select the specific target of the teleport by clicking the tile.`))
            )
        }


    }
}

export namespace PathEditor {

    export type Value = { raw: Path.Step, associated_preview?: PathStepEntity, augmented?: Observable<Path.augmented_step> }
    export type OValue = ObservableArray.ObservableArrayValue<Value>
    export type Data = PathBuilder

    export type options_t = {
        initial: Path.raw,
        commit_handler?: (p: Path.raw) => any,
        discard_handler?: () => any,
        target?: TileRectangle,
        start_state?: movement_state
    }
}