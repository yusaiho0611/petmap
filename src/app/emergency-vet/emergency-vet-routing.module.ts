import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EmergencyVetPage } from './emergency-vet.page';

const routes: Routes = [
  {
    path: '',
    component: EmergencyVetPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmergencyVetPageRoutingModule {}
