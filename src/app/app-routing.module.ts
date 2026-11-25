import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'add-mall',
    loadChildren: () => import('./add-mall/add-mall.module').then( m => m.AddMallPageModule)
  },
  {
    path: 'mall',
    loadChildren: () => import('./mall/mall.module').then( m => m.MallPageModule)
  },
  {
    path: 'emergency-vet',
    loadChildren: () => import('./emergency-vet/emergency-vet.module').then( m => m.EmergencyVetPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
