import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMallPage } from './add-mall.page';

describe('AddMallPage', () => {
  let component: AddMallPage;
  let fixture: ComponentFixture<AddMallPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMallPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
