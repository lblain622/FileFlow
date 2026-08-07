import * as React from "react";
import {FileRecord} from "../types/file";
import { Panel } from "primereact/panel";

export default function FileDetail({ file }: { file: FileRecord }) {
    return (
        <Panel header={file.name}>
            <div>
                <i className="pi pi-chevron-down"></i>
            </div>
        </Panel>
    );


}

