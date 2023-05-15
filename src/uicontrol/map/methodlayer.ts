import {PingType, ScanTree, ScanTreeNode} from "../../model/methods";
import * as leaflet from "leaflet"
import {ScanLayer} from "./layers/ScanLayer";
import {Application} from "../../application";
import {GameMapControl} from "./map";


export class ScanTreeMethodLayer extends ScanLayer {
    private node: ScanTreeNode

    private fit() {
        let bounds = leaflet.latLngBounds([])

        // Include old location in bounds
        if (this.node.parent && this.node.parent.node.where) {
            let a = this.getArea(this.node.parent.node.where)

            if (!a.spot().is_far_away) bounds.extend(this.getArea(this.node.parent.node.where).getBounds())
        }

        // Include next location in bounds
        if (this.node.where) bounds.extend(this.getArea(this.node.where).getBounds())
        if (this.node.solved) bounds.extend(this.getMarker(this.node.solved).getBounds())

        // Include all triple children
        this.node.children().filter((c) => c.parent.key.kind == PingType.TRIPLE).forEach((c) => {
            bounds.extend(this.getMarker(c.solved).getBounds())
        })

        // If there are no valid bounds (because the above all don't apply), default to the scan area as a bound
        if (!bounds.isValid()) this.markers.forEach((e) => bounds.extend(e.getBounds()))

        this._map.fitBounds(bounds.pad(0.1), {
            maxZoom: 4
        })
    }

    public setNode(node: ScanTreeNode) {
        this.node = node
        this.fit()

        let candidates = this.node.candidates()
        let relevant_areas = [this.node.where]
        if (this.node.parent) relevant_areas.push(this.node.parent.node.where);

        this.set_remaining_candidates(candidates.map((c) => this.scantree.spot(c)))
        this.markers.forEach((e, i) => e.setActive(candidates.includes(i + 1)))

        this.areas.forEach((p) => p.setActive(relevant_areas.includes(p.spot().name)))
    }

    constructor(private scantree: ScanTree, app: Application) {
        super(scantree.clue, app);

        // sort markers to correlate to the spot mapping
        this.markers.sort((a, b) => scantree.spotToNumber(a.getSpot()) - scantree.spotToNumber(b.getSpot()))

        this.setAreas(this.scantree.scan_spots)

        // Create labels
        this.markers.forEach((m, i) => {
            m.withLabel((i + 1).toString(), "spot-number", [0, 10])
        })
    }

    public activate(map: GameMapControl) {
        super.activate(map);

        this.scantree.root.sendToUI(this.app)
    }
}