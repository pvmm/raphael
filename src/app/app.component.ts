import {Component} from '@angular/core';
import {Grid} from './classes/grid';
import {AttributeMode} from './enums/attribute-mode';
import {Palette} from './classes/palette';
import {UndoManagerService} from './services/undo-manager.service';
import {Tool} from './enums/tool';
import {MatDialog} from '@angular/material/dialog';
import {NewDialogComponent} from './dialogs/new-dialog/new-dialog.component';
import {FileService} from './services/file.service';
import {OpenDialogComponent, OpenDialogData} from './dialogs/open-dialog/open-dialog.component';
import {ProjectData} from './interfaces/project-data';
import {NewProjectData} from './interfaces/new-project-data';
import {AboutDialogComponent} from './dialogs/about-dialog/about-dialog.component';
import {ExportOptions, ExportService} from './services/export.service';
import {ImportService} from './services/import.service';
import {Rect} from './classes/rect';
import {StorageService} from './services/storage.service';
import {Point} from './classes/point';
import {TITLE} from './app.config';
import {PropertiesDialogComponent} from './dialogs/properties-dialog/properties-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {

  filename: string;
  palette: Palette;
  grid: Grid;
  pixelScaleX = 1;
  pixelScaleY = 1;
  backColorIndex: number;
  foreColorIndex: number;
  tool: Tool;
  zoom: number;
  showGridLines = true;
  imageNumber = 0;
  cursorPosition: Point;

  constructor(
    public dialog: MatDialog,
    private undoManagerService: UndoManagerService,
    private fileService: FileService,
    private importService: ImportService,
    private exportService: ExportService,
    private storageService: StorageService
  ) {
    this.palette = new Palette();
    this.grid = new Grid();
    let projectData = this.storageService.restoreProject();
    if (!projectData) {
      projectData = {
        filename: 'New project.rap',
        width: 64,
        height: 64,
        pixelScaleX: this.pixelScaleX,
        pixelScaleY: this.pixelScaleY,
        attributeMode: AttributeMode.NONE,
        data: null,
        backColorIndex: 0,
        foreColorIndex: 15,
        tool: Tool.DRAW,
        zoom: 5,
        showGridLines: true
      };
    }
    this.init(projectData);
    this.updateTitle();
    window.addEventListener('beforeunload', () => { this.beforeUnload(); });
  }

  init(projectData: ProjectData): void {
    this.filename = projectData.filename;
    this.pixelScaleX = projectData.pixelScaleX;
    this.pixelScaleY = projectData.pixelScaleY;
    this.grid.attributeMode = projectData.attributeMode;
    this.grid.setSize(projectData.width, projectData.height, projectData.backColorIndex);
    if (projectData.data) {
      this.grid.setData(projectData.data);
    }
    this.backColorIndex = projectData.backColorIndex;
    this.foreColorIndex = projectData.foreColorIndex;
    this.tool = projectData.tool;
    this.zoom = projectData.zoom;
    this.showGridLines = projectData.showGridLines;
    this.imageNumber++;
  }

  zoomIn(): void {
    if (this.zoom < 16) {
      this.zoom++;
    }
  }

  zoomOut(): void {
    if (this.zoom > 1) {
      this.zoom--;
    }
  }

  shiftLeft(): void {
    this.undoManagerService.addEdit(
      this.grid.shiftLeft()
    );
  }

  shiftRight(): void {
    this.undoManagerService.addEdit(
      this.grid.shiftRight()
    );
  }

  shiftUp(): void {
    this.undoManagerService.addEdit(
      this.grid.shiftUp()
    );
  }

  shiftDown(): void {
    this.undoManagerService.addEdit(
      this.grid.shiftDown()
    );
  }

  fill(): void {
    this.undoManagerService.addEdit(
      this.grid.fill(this.foreColorIndex)
    );
  }

  clear(): void {
    this.undoManagerService.addEdit(
      this.grid.fill(this.backColorIndex)
    );
  }

  flipHorizontal(): void {
    this.undoManagerService.addEdit(
      this.grid.flipHorizontal()
    );
  }

  flipVertical(): void {
    this.undoManagerService.addEdit(
      this.grid.flipVertical()
    );
  }

  toolChanged(tool: Tool): void {
    this.tool = tool;
  }

  cursorPositionChanged(cursorPosition: Point): void {
    this.cursorPosition = cursorPosition;
  }

  setBackColorIndex(backColorIndex: number): void {
    this.backColorIndex = backColorIndex;
  }

  setForeColorIndex(foreColorIndex: number): void {
    this.foreColorIndex = foreColorIndex;
  }

  updateTitle(): void {
    const title = document.querySelector('#app-title');
    if (title) {
      title.innerHTML = TITLE + (this.filename ? ' - ' + this.filename : '');
    }
  }

  new(): void {
    let defaultNewProjectData = this.storageService.loadNewProjectData();
    if (defaultNewProjectData) {
      defaultNewProjectData.filename = 'New project.rap';
    } else {
      defaultNewProjectData = {
        filename: 'New project.rap',
        width: 64,
        height: 64,
        pixelScaleX: 1,
        pixelScaleY: 1,
        attributeMode: AttributeMode.NONE
      };
    }
    const dialogRef = this.dialog.open(NewDialogComponent, {
      width: '600px',
      data: defaultNewProjectData
    });
    dialogRef.afterClosed().subscribe((newProjectData: NewProjectData) => {
      if (newProjectData) {
        this.undoManagerService.discardAllEdits();
        this.init({
          filename: newProjectData.filename,
          width: newProjectData.width,
          height: newProjectData.height,
          pixelScaleX: newProjectData.pixelScaleX,
          pixelScaleY: newProjectData.pixelScaleY,
          attributeMode: newProjectData.attributeMode,
          data: null,
          backColorIndex: 0,
          foreColorIndex: 15,
          tool: Tool.DRAW,
          zoom: 5,
          showGridLines: true
        });
        this.updateTitle();
        this.storageService.saveNewProjectProjectData(newProjectData);
      }
    });
  }

  open(): void {
    const dialogRef = this.dialog.open(OpenDialogComponent, {
      width: '600px',
      data: {
        fileType: 'Project',
        extension: '.rap',
        file: null
      }
    });
    dialogRef.afterClosed().subscribe((result: OpenDialogData) => {
      if (result) {
        this.fileService.openProject(result.file).subscribe(
          (projectData: ProjectData) => {
            this.init(projectData);
            this.filename = result.file.name;
            this.updateTitle();
          },
          (error) => {
            console.error(error);
          }
        );
      }
    });
  }

  save(): void {
    try {
      this.fileService.saveProject(this.getProjectData(), this.filename);
    } catch (error) {
      console.error(error);
    }
  }

  properties(): void {
    const dialogRef = this.dialog.open(PropertiesDialogComponent, {
      width: '600px',
      data: this.getProjectData()
    });
    dialogRef.afterClosed().subscribe((projectData: ProjectData) => {
      if (projectData) {
        this.filename = projectData.filename;
        this.grid.changeSize(projectData.width, projectData.height, projectData.backColorIndex);
        this.pixelScaleX = projectData.pixelScaleX;
        this.pixelScaleY = projectData.pixelScaleY;
        this.grid.attributeMode = projectData.attributeMode;
        this.updateTitle();
        this.imageNumber++;
      }
    });
  }

  importPNG(): void {
    const dialogRef = this.dialog.open(OpenDialogComponent, {
      width: '600px',
      data: {
        fileType: 'PNG file',
        extension: '.png',
        file: null
      }
    });
    dialogRef.afterClosed().subscribe((result: OpenDialogData) => {
      if (result) {
        this.fileService.openBinaryFile(result.file).subscribe(
          (arrayBuffer: ArrayBuffer) => {
            const data: number[][] = this.importService.importPNGFile(arrayBuffer, this.palette);
            const width = data[0].length;
            const height = data.length;
            this.undoManagerService.addEdit(
              this.grid.setArea(new Rect(0, 0, width, height), data)
            );
          },
          (error) => {
            console.error(error);
          }
        );
      }
    });
  }

  exportPNG(): void {
    this.fileService.saveBinaryFile(
      this.exportService.exportPNGFile(this.getProjectData(), this.palette),
      (this.getBaseFilename() || 'export') + '.png',
      'image/png'
    );
  }

  exportBinary(): void {
    this.fileService.saveBinaryFile(
      this.exportService.exportBinaryFile(this.getProjectData(), this.palette),
      (this.getBaseFilename() || 'export') + '.bin',
      'application/octet-stream'
    );
  }

  exportAssembly(options: ExportOptions): void {
    this.fileService.saveTextFile(
      this.exportService.exportAssemblyFile(this.getProjectData(), options),
      (this.getBaseFilename() || 'export') + '.a99',
    );
  }

  exportMonochromeLinearAssembly(): void {
    this.fileService.saveTextFile(
      this.exportService.exportMonochromeLinearAssemblyFile(this.getProjectData()),
      (this.getBaseFilename() || 'export') + '.a99',
    );
  }

  exportHex(): void {
    this.fileService.saveTextFile(
      this.exportService.exportHexString(this.getProjectData()),
      (this.getBaseFilename() || 'export') + '.txt',
    );
  }

  getBaseFilename(): string {
    return this.filename ? this.filename.split('.')[0] : null;
  }

  about(): void {
    const dialogRef = this.dialog.open(AboutDialogComponent, {
      width: '600px'
    });
  }

  getProjectData(): ProjectData {
    return {
      filename: this.filename,
      width: this.grid.width,
      height: this.grid.height,
      pixelScaleX: this.pixelScaleX,
      pixelScaleY: this.pixelScaleY,
      attributeMode: this.grid.attributeMode,
      data: this.grid.getData(),
      backColorIndex: this.backColorIndex,
      foreColorIndex: this.foreColorIndex,
      tool: this.tool,
      zoom: this.zoom,
      showGridLines: this.showGridLines
    };
  }

  beforeUnload(): void {
    this.storageService.backupProject(this.getProjectData());
  }
}
