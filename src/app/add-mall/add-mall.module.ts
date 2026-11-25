import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { AddMallPageRoutingModule } from './add-mall-routing.module';

import { AddMallPage } from './add-mall.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddMallPageRoutingModule
  ],
  declarations: [AddMallPage]
})
export class AddMallPageModule {}
