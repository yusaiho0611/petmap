import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddMallPage } from './add-mall.page';

const routes: Routes = [
  {
    path: '',
    component: AddMallPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddMallPageRoutingModule {}
