import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular/lazy';

import { EmergencyVetPageRoutingModule } from './emergency-vet-routing.module';

import { EmergencyVetPage } from './emergency-vet.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    EmergencyVetPageRoutingModule
  ],
  declarations: [EmergencyVetPage]
})
export class EmergencyVetPageModule {}
