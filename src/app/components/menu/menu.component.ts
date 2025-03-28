import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ExportOptions} from '../../services/export.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.less']
})
export class MenuComponent implements OnInit {

  @Input() showGridLines: boolean;

  @Output() newClicked = new EventEmitter();
  @Output() openClicked = new EventEmitter();
  @Output() saveClicked = new EventEmitter();
  @Output() propertiesClicked = new EventEmitter();
  @Output() importPNGClicked = new EventEmitter();
  @Output() exportPNGClicked = new EventEmitter();
  @Output() exportBinaryClicked = new EventEmitter();
  @Output() exportAssemblyClicked = new EventEmitter<ExportOptions>();
  @Output() exportMonochromeLinearAssemblyClicked = new EventEmitter();
  @Output() exportHexClicked = new EventEmitter();
  @Output() showGridLinesChange = new EventEmitter<boolean>();
  @Output() aboutClicked = new EventEmitter();

  constructor() {
  }

  ngOnInit(): void {
  }

  new(): void {
    this.newClicked.emit();
  }

  open(): void {
    this.openClicked.emit();
  }

  save(): void {
    this.saveClicked.emit();
  }

  properties(): void {
    this.propertiesClicked.emit();
  }

  importPNG(): void {
    this.importPNGClicked.emit();
  }

  exportPNG(): void {
    this.exportPNGClicked.emit();
  }

  exportBinary(): void {
    this.exportBinaryClicked.emit();
  }

  exportAssembly(columns: boolean, unpack): void {
    this.exportAssemblyClicked.emit({columns, unpack});
  }

  exportMonochromeLinearAssembly(): void {
    this.exportMonochromeLinearAssemblyClicked.emit();
  }

  exportHex(): void {
    this.exportHexClicked.emit();
  }

  toggleGridLines(): void {
    this.showGridLinesChange.emit(this.showGridLines);
  }

  about(): void {
    this.aboutClicked.emit();
  }
}
